import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavMenuService } from './nav-menu.service';
import { INSPECTORS, type InspectorRecord } from './inspectors.data';
import { InspectionStoreService } from './inspection-store.service';
import { type InspectionRecord, type InspectionStatus } from './inspection-data';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

type InspectorDetailTab = 'summary' | 'inspection-history';
type InspectionWorkflowStatus = 'New' | 'Pending' | 'Closed';
type InspectionStatusReason =
  | 'Created'
  | 'Not Assigned'
  | 'Not Scheduled'
  | 'Scheduled'
  | 'Appointment Complete'
  | 'Completed'
  | 'Canceled';
type InspectionHistorySortField =
  | 'inspectionDate'
  | 'inspectionType'
  | 'inspectionStatus'
  | 'nextDueDate';
type SortDirection = 'asc' | 'desc';

type InspectionHistoryRow = {
  inspectionId: string;
  inspectionDate: string;
  inspectionDateTimestamp: number;
  inspectionType: 'Overt' | 'Covert';
  inspectionStatusDisplay: string;
  nextDueDate: string;
  nextDueDateTimestamp: number;
  comments: string;
};

@Component({
  selector: 'app-inspector-detail',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    ToggleSwitchModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspector-detail.component.html',
  styleUrl: './inspector-detail.component.scss',
})
export class InspectorDetailComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly browserLocation = inject(Location);
  private readonly inspectionStore = inject(InspectionStoreService);

  protected readonly inspectorId = signal('');
  protected readonly inspectorName = signal('');
  protected readonly region = signal('');
  protected readonly externalIdentifier = signal('');
  protected readonly inspectionAssignee = signal('');
  protected readonly active = signal(true);

  protected readonly activeTab = signal<InspectorDetailTab>('summary');
  protected readonly inspectionHistoryRowsState = signal<InspectionHistoryRow[]>([]);
  protected readonly inspectionHistorySortField =
    signal<InspectionHistorySortField>('inspectionDate');
  protected readonly inspectionHistorySortDirection = signal<SortDirection>('desc');

  protected readonly inspectionHistoryRows = computed(() => {
    const sortField = this.inspectionHistorySortField();
    const sortDirection = this.inspectionHistorySortDirection();
    const directionMultiplier = sortDirection === 'asc' ? 1 : -1;

    return [...this.inspectionHistoryRowsState()].sort((leftRow, rightRow) => {
      switch (sortField) {
        case 'inspectionDate':
          return (
            (leftRow.inspectionDateTimestamp - rightRow.inspectionDateTimestamp) *
            directionMultiplier
          );
        case 'inspectionType':
          return (
            leftRow.inspectionType.localeCompare(rightRow.inspectionType) * directionMultiplier
          );
        case 'inspectionStatus':
          return (
            leftRow.inspectionStatusDisplay.localeCompare(rightRow.inspectionStatusDisplay) *
            directionMultiplier
          );
        case 'nextDueDate':
          return (
            (leftRow.nextDueDateTimestamp - rightRow.nextDueDateTimestamp) * directionMultiplier
          );
        default:
          return 0;
      }
    });
  });

  protected readonly activeInspectionsAssigned = computed(() => {
    const inspectionAssigneeValue = this.inspectionAssignee().trim().toLowerCase();
    if (!inspectionAssigneeValue || inspectionAssigneeValue === 'unassigned') {
      return 0;
    }

    return this.inspectionStore
      .inspections()
      .filter(
        (inspection) =>
          inspection.assignedInspector.trim().toLowerCase() === inspectionAssigneeValue,
      )
      .filter((inspection) => {
        const workflowStatus = this.getInspectionWorkflowStatus(inspection);
        return workflowStatus === 'New' || workflowStatus === 'Pending';
      }).length;
  });

  protected readonly activeLabel = computed(() => (this.active() ? 'Yes' : 'No'));

  protected updateRegion(event: Event): void {
    this.region.set((event.target as HTMLInputElement).value);
  }

  protected updateExternalIdentifier(event: Event): void {
    this.externalIdentifier.set((event.target as HTMLInputElement).value);
  }

  protected updateActive(value: boolean): void {
    this.active.set(value);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.route.params.subscribe((params) => {
      const nextInspectorId = params['inspectorId'] ?? '';
      this.inspectorId.set(nextInspectorId);
      this.loadInspector(nextInspectorId);
    });
  }

  private loadInspector(id: string): void {
    const inspector = INSPECTORS.find((row) => row.inspectorId === id) ?? null;
    if (!inspector) {
      this.router.navigate(['/inspectors']);
      return;
    }

    this.assignInspector(inspector);
  }

  private assignInspector(inspector: InspectorRecord): void {
    this.inspectorName.set(inspector.name);
    this.region.set(inspector.region);
    this.active.set(inspector.active);
    this.inspectionAssignee.set(inspector.inspectionAssignee ?? inspector.name);
    this.externalIdentifier.set(
      inspector.externalIdentifier ?? `EXT-${inspector.inspectorId.toUpperCase()}`,
    );
    this.loadInspectionHistory(inspector.inspectionAssignee ?? inspector.name);
  }

  private loadInspectionHistory(inspectorName: string): void {
    const normalizedInspectorName = inspectorName.trim().toLowerCase();

    const historyRows = this.inspectionStore
      .inspections()
      .filter(
        (inspection) =>
          inspection.assignedInspector.trim().toLowerCase() === normalizedInspectorName,
      )
      .map((inspection) => {
        const inspectionDateTimestamp = this.parseDateToTimestamp(inspection.appointmentDate);
        const nextDueDateTimestamp = this.parseDateToTimestamp(inspection.nextDue);
        const inspectionWorkflowStatus = this.getInspectionWorkflowStatus(inspection);
        const inspectionStatusReason = this.getInspectionStatusReason(inspection);

        return {
          inspectionId: inspection.inspectionId,
          inspectionDate: this.formatDateForDisplay(inspection.appointmentDate),
          inspectionDateTimestamp,
          inspectionType: inspection.inspectionType,
          inspectionStatusDisplay: `${inspectionWorkflowStatus} - ${inspectionStatusReason}`,
          nextDueDate: this.formatDateForDisplay(inspection.nextDue),
          nextDueDateTimestamp,
          comments: inspection.notes.join('\n').slice(0, 500),
        } satisfies InspectionHistoryRow;
      })
      .sort(
        (leftRow, rightRow) => rightRow.inspectionDateTimestamp - leftRow.inspectionDateTimestamp,
      );

    this.inspectionHistoryRowsState.set(historyRows);
    this.inspectionHistorySortField.set('inspectionDate');
    this.inspectionHistorySortDirection.set('desc');
  }

  private getInspectionWorkflowStatus(inspection: InspectionRecord): InspectionWorkflowStatus {
    if (
      inspection.inspectionStatus === 'Canceled' ||
      inspection.inspectionStatus === 'Good' ||
      inspection.inspectionStatus === 'Satisfactory' ||
      inspection.inspectionStatus === 'Unsatisfactory'
    ) {
      return 'Closed';
    }

    const hasAssignedInspector = this.hasAssignedInspector(inspection);
    const hasScheduledAppointment = this.hasScheduledAppointment(inspection);

    if (!hasAssignedInspector && !hasScheduledAppointment) {
      return 'New';
    }

    return 'Pending';
  }

  private getInspectionStatusReason(inspection: InspectionRecord): InspectionStatusReason {
    const workflowStatus = this.getInspectionWorkflowStatus(inspection);

    if (workflowStatus === 'Closed') {
      return inspection.inspectionStatus === 'Canceled' ? 'Canceled' : 'Completed';
    }

    const hasAssignedInspector = this.hasAssignedInspector(inspection);
    const hasScheduledAppointment = this.hasScheduledAppointment(inspection);

    if (workflowStatus === 'New') {
      return 'Created';
    }

    if (!hasAssignedInspector) {
      return 'Not Assigned';
    }

    if (!hasScheduledAppointment) {
      return 'Not Scheduled';
    }

    return this.isAppointmentComplete(inspection) ? 'Appointment Complete' : 'Scheduled';
  }

  private parseDateToTimestamp(value: string): number {
    const directParsedDate = new Date(value);
    if (!Number.isNaN(directParsedDate.getTime())) {
      return directParsedDate.getTime();
    }

    const normalizedValue = value.trim().replace(/\//g, '-');
    const parts = normalizedValue.split('-');
    if (parts.length !== 3) {
      return 0;
    }

    const firstPart = Number(parts[0]);
    const secondPart = Number(parts[1]);
    const thirdPart = Number(parts[2]);

    if ([firstPart, secondPart, thirdPart].some((part) => Number.isNaN(part))) {
      return 0;
    }

    if (parts[0].length === 4) {
      return new Date(firstPart, secondPart - 1, thirdPart).getTime();
    }

    const year = parts[2].length === 2 ? 2000 + thirdPart : thirdPart;
    return new Date(year, firstPart - 1, secondPart).getTime();
  }

  private hasAssignedInspector(inspection: InspectionRecord): boolean {
    return (
      inspection.assignedInspector.trim().length > 0 &&
      inspection.assignedInspector !== 'Unassigned'
    );
  }

  private hasScheduledAppointment(inspection: InspectionRecord): boolean {
    return inspection.appointmentDate.trim().length > 0;
  }

  private isAppointmentComplete(inspection: InspectionRecord): boolean {
    if (!this.hasScheduledAppointment(inspection)) {
      return false;
    }

    const appointmentDate = this.parseDateToTimestamp(inspection.appointmentDate);
    return appointmentDate > 0 && appointmentDate < Date.now();
  }

  private formatDateForDisplay(value: string): string {
    const timestamp = this.parseDateToTimestamp(value);
    if (timestamp === 0) {
      return value;
    }

    const parsedDate = new Date(timestamp);
    const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsedDate.getDate()}`.padStart(2, '0');
    const year = `${parsedDate.getFullYear()}`;

    return `${month}-${day}-${year}`;
  }

  protected goBack(): void {
    this.browserLocation.back();
  }

  protected showSummaryTab(): void {
    this.activeTab.set('summary');
  }

  protected showInspectionHistoryTab(): void {
    this.activeTab.set('inspection-history');
  }

  protected setInspectionHistorySort(field: InspectionHistorySortField): void {
    if (this.inspectionHistorySortField() === field) {
      const nextSortDirection = this.inspectionHistorySortDirection() === 'asc' ? 'desc' : 'asc';
      this.inspectionHistorySortDirection.set(nextSortDirection);
      return;
    }

    this.inspectionHistorySortField.set(field);
    this.inspectionHistorySortDirection.set('asc');
  }

  protected inspectionSortLabel(field: InspectionHistorySortField): string {
    if (this.inspectionHistorySortField() !== field) {
      return '▼';
    }

    return this.inspectionHistorySortDirection() === 'asc' ? '▲' : '▼';
  }
}
