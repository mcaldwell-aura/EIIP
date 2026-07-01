import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavMenuService } from './nav-menu.service';
import { InspectionRecord, INSPECTIONS } from './inspection-data';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

type SortDirection = 'asc' | 'desc';
type UpcomingSortKey =
  | 'candidateName'
  | 'inspectionDate'
  | 'nextDue'
  | 'priority'
  | 'inspectionReason'
  | 'inspectionType'
  | 'inspectionStatus';
type RecentlySortKey =
  | 'candidateName'
  | 'inspectionDate'
  | 'nextDue'
  | 'priority'
  | 'inspectionReason'
  | 'inspectionType'
  | 'inspectionStatus';
type TabId = 'upcoming' | 'recently-completed';

type UpcomingInspectionRow = {
  inspectionId: string;
  candidateName: string;
  inspectionDate: string;
  nextDue: string;
  priority: number;
  inspectionReason: string;
  inspectionType: string;
  inspectionStatus: string;
};

type RecentlyCompletedRow = {
  inspectionId: string;
  candidateName: string;
  inspectionDate: string;
  nextDue: string;
  priority: number;
  inspectionReason: string;
  inspectionType: string;
  inspectionStatus: string;
};

@Component({
  selector: 'app-inspector-dashboard',
  imports: [
    RouterModule,
    CommonModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspector-dashboard.component.html',
  styleUrl: './inspector-dashboard.component.scss',
})
export class InspectorDashboardComponent {
  protected readonly menuService = inject(NavMenuService);
  protected readonly activeTab = signal<TabId>('upcoming');

  // Current inspector name - TODO: replace with actual logged-in user
  protected readonly currentInspector = signal('Monique Hale');

  protected readonly summaryCards = signal([
    { label: 'Assigned to Me', value: 6 },
    { label: 'Due Today', value: 0 },
    { label: 'Completed This Week', value: 2 },
  ]);

  protected readonly collaborators = signal(['ML', 'ZP', 'AJ', 'CT']);

  // Upcoming Inspections - sorted by Status (asc), then by Date (asc)
  protected readonly upcomingSortKey = signal<UpcomingSortKey>('inspectionStatus');
  protected readonly upcomingSortDirection = signal<SortDirection>('asc');
  protected readonly upcomingSecondSortKey = signal<UpcomingSortKey>('inspectionDate');
  protected readonly upcomingSecondSortDirection = signal<SortDirection>('asc');

  protected readonly upcomingInspections = computed(() => {
    const inspector = this.currentInspector();
    const filtered = INSPECTIONS.filter(
      (inspection) =>
        inspection.assignedInspector === inspector &&
        (inspection.inspectionStatus === 'Scheduled' || inspection.inspectionStatus === 'Planned'),
    );

    return this.sortInspections(
      this.convertToUpcomingRows(filtered),
      this.upcomingSortKey(),
      this.upcomingSortDirection(),
      this.upcomingSecondSortKey(),
      this.upcomingSecondSortDirection(),
    );
  });

  // Recently Completed - sorted by Date (desc), showing inspections from 7+ days ago
  protected readonly recentlySortKey = signal<RecentlySortKey>('inspectionDate');
  protected readonly recentlySortDirection = signal<SortDirection>('desc');

  protected readonly recentlyCompletedInspections = computed(() => {
    const inspector = this.currentInspector();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const filtered = INSPECTIONS.filter((inspection) => {
      if (inspection.assignedInspector !== inspector) return false;
      if (
        inspection.inspectionStatus === 'Planned' ||
        inspection.inspectionStatus === 'Scheduled' ||
        inspection.inspectionStatus === 'Canceled'
      )
        return false;

      const inspectionDate = this.parseDate(inspection.appointmentDate);
      return inspectionDate <= sevenDaysAgo;
    });

    return this.sortRecentlyCompleted(
      this.convertToRecentlyRows(filtered),
      this.recentlySortKey(),
      this.recentlySortDirection(),
    );
  });

  protected setUpcomingSort(key: UpcomingSortKey): void {
    if (this.upcomingSortKey() === key) {
      this.upcomingSortDirection.set(this.upcomingSortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.upcomingSortKey.set(key);
      this.upcomingSortDirection.set('asc');
    }
  }

  protected setRecentlySort(key: RecentlySortKey): void {
    if (this.recentlySortKey() === key) {
      this.recentlySortDirection.set(this.recentlySortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.recentlySortKey.set(key);
      this.recentlySortDirection.set('asc');
    }
  }

  protected getSortIndicator(key: string, currentKey: string, direction: SortDirection): string {
    if (key !== currentKey) return '↕';
    return direction === 'asc' ? '↑' : '↓';
  }

  private convertToUpcomingRows(inspections: InspectionRecord[]): UpcomingInspectionRow[] {
    return inspections.map((i) => ({
      inspectionId: i.inspectionId,
      candidateName: i.subjectName,
      inspectionDate: i.appointmentDate,
      nextDue: i.nextDue,
      priority: i.priority,
      inspectionReason: i.inspectionReason,
      inspectionType: i.inspectionType,
      inspectionStatus: i.inspectionStatus,
    }));
  }

  private convertToRecentlyRows(inspections: InspectionRecord[]): RecentlyCompletedRow[] {
    return inspections.map((i) => ({
      inspectionId: i.inspectionId,
      candidateName: i.subjectName,
      inspectionDate: i.appointmentDate,
      nextDue: i.nextDue,
      priority: i.priority,
      inspectionReason: i.inspectionReason,
      inspectionType: i.inspectionType,
      inspectionStatus: i.inspectionStatus,
    }));
  }

  private sortInspections(
    rows: UpcomingInspectionRow[],
    primaryKey: UpcomingSortKey,
    primaryDirection: SortDirection,
    secondaryKey: UpcomingSortKey,
    secondaryDirection: SortDirection,
  ): UpcomingInspectionRow[] {
    return [...rows].sort((a, b) => {
      const aVal = this.getUpcomingValue(a, primaryKey);
      const bVal = this.getUpcomingValue(b, primaryKey);

      let result = this.compareValues(aVal, bVal);
      if (result === 0) {
        const aSec = this.getUpcomingValue(a, secondaryKey);
        const bSec = this.getUpcomingValue(b, secondaryKey);
        result = this.compareValues(aSec, bSec);
        return primaryDirection === 'asc'
          ? secondaryDirection === 'asc'
            ? result
            : -result
          : secondaryDirection === 'asc'
            ? -result
            : result;
      }
      return primaryDirection === 'asc' ? result : -result;
    });
  }

  private sortRecentlyCompleted(
    rows: RecentlyCompletedRow[],
    key: RecentlySortKey,
    direction: SortDirection,
  ): RecentlyCompletedRow[] {
    return [...rows].sort((a, b) => {
      const aVal = this.getRecentlyValue(a, key);
      const bVal = this.getRecentlyValue(b, key);

      const result = this.compareValues(aVal, bVal);
      return direction === 'asc' ? result : -result;
    });
  }

  private getUpcomingValue(row: UpcomingInspectionRow, key: UpcomingSortKey): string | number {
    switch (key) {
      case 'candidateName':
        return row.candidateName;
      case 'inspectionDate':
        return row.inspectionDate;
      case 'nextDue':
        return row.nextDue;
      case 'priority':
        return row.priority;
      case 'inspectionReason':
        return row.inspectionReason;
      case 'inspectionType':
        return row.inspectionType;
      case 'inspectionStatus':
        return row.inspectionStatus;
    }
  }

  private getRecentlyValue(row: RecentlyCompletedRow, key: RecentlySortKey): string | number {
    switch (key) {
      case 'candidateName':
        return row.candidateName;
      case 'inspectionDate':
        return row.inspectionDate;
      case 'nextDue':
        return row.nextDue;
      case 'priority':
        return row.priority;
      case 'inspectionReason':
        return row.inspectionReason;
      case 'inspectionType':
        return row.inspectionType;
      case 'inspectionStatus':
        return row.inspectionStatus;
    }
  }

  private compareValues(a: string | number, b: string | number): number {
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    return aStr.localeCompare(bStr);
  }

  private parseDate(dateStr: string): Date {
    const [month, day, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
