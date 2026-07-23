import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateStoreService } from './candidate-store.service';
import { INSPECTIONS, type InspectionRecord, type InspectionStatus } from './inspection-data';
import { NavMenuService } from './nav-menu.service';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

type SummaryCard = {
  label: string;
  value: number;
};

type ChartDatum = {
  label: string;
  value: number;
};

type CandidateMaturity = 'New' | 'Established';

type CandidateMaturitySummaryRow = {
  label: string;
  value: number;
};

type InspectionResultByMaturityDatum = {
  label: string;
  newCount: number;
  establishedCount: number;
};

type DueWindowCounter = {
  label: '30 Days' | '60 Days' | '90 Days';
  count: number;
};

type ActivityStatus =
  | 'Planned'
  | 'Scheduled'
  | 'Canceled'
  | 'Completed'
  | 'Closed'
  | 'In Review'
  | 'Escalated';

type ActivityRow = {
  candidateName: string;
  inspectionDate: string;
  nextDue: string;
  priority: number;
  inspectionReason: string;
  inspectionStatus: ActivityStatus;
  inspectionType: 'Overt' | 'Covert';
};

type SortColumn =
  | 'candidateName'
  | 'inspectionDate'
  | 'nextDue'
  | 'priority'
  | 'inspectionReason'
  | 'inspectionType'
  | 'inspectionStatus';

type SortDirection = 'asc' | 'desc';
type ToolbarSortSelection = 'default' | 'asc' | 'desc';
type ActivityStatusFilter = ActivityStatus | 'all';
type ActivityTypeFilter = ActivityRow['inspectionType'] | 'all';
type ActivityReasonFilter = ActivityRow['inspectionReason'] | 'all';

type SortState = {
  column: SortColumn;
  direction: SortDirection;
};

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

@Component({
  selector: 'app-dashboard',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    RippleModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly menuService = inject(NavMenuService);
  protected readonly currentInspector = signal('Monique Hale');
  private readonly candidateStore = inject(CandidateStoreService);

  private static readonly lastThirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  private static readonly millisecondsPerDay = 24 * 60 * 60 * 1000;

  private readonly excludedStatuses = new Set<ActivityStatus>(['Planned', 'Scheduled', 'Canceled']);

  protected readonly candidateMaturitySummaryRows = computed<CandidateMaturitySummaryRow[]>(() => {
    const activeCandidates = this.candidateStore
      .candidates()
      .filter((candidate) => this.isActiveCandidate(candidate.endDate));
    const newCandidates = activeCandidates.filter(
      (candidate) => this.getCandidateMaturity(candidate.startDate) === 'New',
    ).length;
    const establishedCandidates = activeCandidates.length - newCandidates;

    return [
      { label: 'Total Active Candidates', value: activeCandidates.length },
      { label: 'New Candidates', value: newCandidates },
      { label: 'Established Candidates', value: establishedCandidates },
    ];
  });

  protected readonly inspectionResultsByMaturity = signal<InspectionResultByMaturityDatum[]>([
    { label: 'Excellent', newCount: 8, establishedCount: 15 },
    { label: 'Good', newCount: 9, establishedCount: 17 },
    { label: 'Satisfactory', newCount: 4, establishedCount: 8 },
    { label: 'Marginal', newCount: 9, establishedCount: 15 },
    { label: 'Unsatisfactory', newCount: 7, establishedCount: 11 },
  ]);

  protected readonly summaryCards = computed<SummaryCard[]>(() => {
    const today = this.startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const currentInspector = this.currentInspector();

    let assignedToMe = 0;
    let dueToday = 0;
    let pendingInspections = 0;
    let scheduledInspections = 0;
    let completedThisWeek = 0;
    let missedInspections = 0;

    for (const inspection of INSPECTIONS) {
      const inspectionDateTime = this.parseInspectionDateTime(inspection);
      const inspectionDay = this.startOfDay(inspectionDateTime);
      const isPending = this.isPendingStatus(inspection.inspectionStatus);
      const isScheduled = inspection.inspectionStatus === 'Scheduled';
      const isCanceled = inspection.inspectionStatus === 'Canceled';
      const isCompletedStatus = !isPending && !isScheduled && !isCanceled;

      if (inspection.assignedInspector === currentInspector && (isPending || isScheduled)) {
        assignedToMe += 1;
      }

      if (isScheduled && inspectionDay.getTime() === today.getTime()) {
        dueToday += 1;
      }

      if (isPending) {
        pendingInspections += 1;
      }

      if (isScheduled && inspectionDateTime.getTime() > Date.now()) {
        scheduledInspections += 1;
      }

      if (
        isCompletedStatus &&
        inspectionDay.getTime() >= sevenDaysAgo.getTime() &&
        inspectionDay.getTime() < tomorrow.getTime()
      ) {
        completedThisWeek += 1;
      }

      if (isScheduled && inspectionDateTime.getTime() < Date.now()) {
        missedInspections += 1;
      }
    }

    return [
      { label: 'Assigned to Me', value: assignedToMe },
      { label: 'Due Today', value: dueToday },
      { label: 'Pending Inspections', value: pendingInspections },
      { label: 'Scheduled Inspections', value: scheduledInspections },
      { label: 'Completed this week', value: completedThisWeek },
      { label: 'Missed Inspections', value: missedInspections },
    ];
  });

  protected readonly inspectionResultsByMaturityWithTotals = computed(() =>
    this.inspectionResultsByMaturity().map((item) => ({
      ...item,
      total: item.newCount + item.establishedCount,
    })),
  );

  protected readonly inspectionResultsByMaturityMax = computed(() =>
    Math.max(...this.inspectionResultsByMaturityWithTotals().map((item) => item.total)),
  );

  protected readonly reasonsForInspection = signal<ChartDatum[]>([
    { label: 'Change', value: 10 },
    { label: 'Original', value: 15 },
    { label: 'ReExam', value: 22 },
    { label: 'Reinstatement', value: 24 },
    { label: 'Periodic', value: 21 },
  ]);

  protected readonly activityRows = signal<ActivityRow[]>([
    {
      candidateName: 'Alyssa Campos',
      inspectionDate: '2026-06-16T14:20:00',
      nextDue: '2026-09-16',
      priority: 93,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Completed',
      inspectionType: 'Overt',
    },
    {
      candidateName: 'Brandon Lin',
      inspectionDate: '2026-06-12T09:45:00',
      nextDue: '2026-09-12',
      priority: 97,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'In Review',
      inspectionType: 'Overt',
    },
    {
      candidateName: 'Carlos Vega',
      inspectionDate: '2026-06-10T08:15:00',
      nextDue: '2026-09-10',
      priority: 98,
      inspectionReason: 'Re-Examination',
      inspectionStatus: 'Closed',
      inspectionType: 'Covert',
    },
    {
      candidateName: 'Diana Reeves',
      inspectionDate: '2026-06-05T15:30:00',
      nextDue: '2026-09-05',
      priority: 97,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'In Review',
      inspectionType: 'Overt',
    },
    {
      candidateName: 'Ethan Patel',
      inspectionDate: '2026-05-30T13:05:00',
      nextDue: '2026-08-30',
      priority: 98,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Escalated',
      inspectionType: 'Covert',
    },
    {
      candidateName: 'Farah Nouri',
      inspectionDate: '2026-05-25T11:40:00',
      nextDue: '2026-08-25',
      priority: 91,
      inspectionReason: 'Biennial',
      inspectionStatus: 'Completed',
      inspectionType: 'Overt',
    },
    {
      candidateName: 'Grace Ito',
      inspectionDate: '2026-05-20T10:10:00',
      nextDue: '2026-08-20',
      priority: 89,
      inspectionReason: 'Investigate',
      inspectionStatus: 'Completed',
      inspectionType: 'Covert',
    },
  ]);

  protected readonly activitySort = signal<SortState>({
    column: 'inspectionDate',
    direction: 'desc',
  });

  protected readonly activityStatusFilter = signal<ActivityStatusFilter>('all');
  protected readonly activityTypeFilter = signal<ActivityTypeFilter>('all');
  protected readonly activityReasonFilter = signal<ActivityReasonFilter>('all');
  protected readonly activityTypeFilterOptions: SelectOption<ActivityTypeFilter>[] = [
    { label: 'Inspection Type: All', value: 'all' },
    { label: 'Inspection Type: Overt', value: 'Overt' },
    { label: 'Inspection Type: Covert', value: 'Covert' },
  ];
  protected readonly activityReasonFilterOptions: SelectOption<ActivityReasonFilter>[] = [
    { label: 'Reason: All', value: 'all' },
    { label: 'Reason: Follow Up', value: 'Follow Up' },
    { label: 'Reason: Investigate', value: 'Investigate' },
    { label: 'Reason: Biennial', value: 'Biennial' },
    { label: 'Reason: Re-Examination', value: 'Re-Examination' },
  ];
  protected readonly activityStatusFilterOptions: SelectOption<ActivityStatusFilter>[] = [
    { label: 'Status: All', value: 'all' },
    { label: 'Status: Completed', value: 'Completed' },
    { label: 'Status: Closed', value: 'Closed' },
    { label: 'Status: In Review', value: 'In Review' },
    { label: 'Status: Escalated', value: 'Escalated' },
  ];
  protected readonly activityDateSortOptions: SelectOption<ToolbarSortSelection>[] = [
    { label: 'Inspection Date: Newest First', value: 'default' },
    { label: 'Inspection Date: Newest First', value: 'desc' },
    { label: 'Inspection Date: Oldest First', value: 'asc' },
  ];
  protected readonly activityCandidateSortOptions: SelectOption<ToolbarSortSelection>[] = [
    { label: 'Candidate Name: Default', value: 'default' },
    { label: 'Candidate Name: A to Z', value: 'asc' },
    { label: 'Candidate Name: Z to A', value: 'desc' },
  ];
  protected readonly activityPrioritySortOptions: SelectOption<ToolbarSortSelection>[] = [
    { label: 'Priority: Highest First', value: 'default' },
    { label: 'Priority: Highest First', value: 'desc' },
    { label: 'Priority: Lowest First', value: 'asc' },
  ];

  protected readonly filteredSortedActivityRows = computed(() => {
    const now = Date.now();
    const sort = this.activitySort();
    const statusFilter = this.activityStatusFilter();
    const typeFilter = this.activityTypeFilter();
    const reasonFilter = this.activityReasonFilter();

    const filteredRows = this.activityRows().filter((row) => {
      const inspectionDateMs = Date.parse(row.inspectionDate);
      const isWithinLastThirtyDays =
        inspectionDateMs <= now && now - inspectionDateMs <= DashboardComponent.lastThirtyDaysMs;
      const isExcludedStatus = this.excludedStatuses.has(row.inspectionStatus);
      const matchesStatus = statusFilter === 'all' || row.inspectionStatus === statusFilter;
      const matchesType = typeFilter === 'all' || row.inspectionType === typeFilter;
      const matchesReason = reasonFilter === 'all' || row.inspectionReason === reasonFilter;
      return (
        isWithinLastThirtyDays && !isExcludedStatus && matchesStatus && matchesType && matchesReason
      );
    });

    return [...filteredRows].sort((a, b) => {
      const primary = this.compareByColumn(a, b, sort.column, sort.direction);
      if (primary !== 0) {
        return primary;
      }

      if (sort.column !== 'inspectionDate') {
        const byInspectionDateDesc = this.compareByColumn(a, b, 'inspectionDate', 'desc');
        if (byInspectionDateDesc !== 0) {
          return byInspectionDateDesc;
        }
      }

      if (sort.column !== 'candidateName') {
        return this.compareByColumn(a, b, 'candidateName', 'asc');
      }

      return 0;
    });
  });

  protected readonly selectedDateSort = computed<ToolbarSortSelection>(() => {
    if (this.activitySort().column !== 'inspectionDate') {
      return 'default';
    }

    return this.activitySort().direction;
  });

  protected readonly selectedCandidateSort = computed<ToolbarSortSelection>(() => {
    if (this.activitySort().column !== 'candidateName') {
      return 'default';
    }

    return this.activitySort().direction;
  });

  protected readonly selectedPrioritySort = computed<ToolbarSortSelection>(() => {
    if (this.activitySort().column !== 'priority') {
      return 'default';
    }

    return this.activitySort().direction;
  });

  protected readonly inspectionsDueCounters = computed<DueWindowCounter[]>(() => {
    let dueIn30 = 0;
    let dueIn60 = 0;
    let dueIn90 = 0;

    for (const row of this.activityRows()) {
      const daysUntilDue = this.dayDifferenceFromToday(row.nextDue);
      if (daysUntilDue < 0 || daysUntilDue > 90) {
        continue;
      }

      if (daysUntilDue <= 30) {
        dueIn30 += 1;
      } else if (daysUntilDue <= 60) {
        dueIn60 += 1;
      } else {
        dueIn90 += 1;
      }
    }

    return [
      { label: '30 Days', count: dueIn30 },
      { label: '60 Days', count: dueIn60 },
      { label: '90 Days', count: dueIn90 },
    ];
  });

  protected readonly reasonsForInspectionMax = computed(() =>
    Math.max(...this.reasonsForInspection().map((item) => item.value)),
  );

  protected readonly collaboratorInitials = signal(['L', 'M', 'A', 'S']);

  protected setActivitySort(column: SortColumn): void {
    this.activitySort.update((current) => {
      if (current.column !== column) {
        return { column, direction: 'asc' };
      }

      return {
        column,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  }

  protected updateActivityStatusFilter(event: Event): void {
    this.activityStatusFilter.set(
      (event.target as HTMLSelectElement).value as ActivityStatusFilter,
    );
  }

  protected updateActivityTypeFilter(event: Event): void {
    this.activityTypeFilter.set((event.target as HTMLSelectElement).value as ActivityTypeFilter);
  }

  protected updateActivityReasonFilter(event: Event): void {
    this.activityReasonFilter.set(
      (event.target as HTMLSelectElement).value as ActivityReasonFilter,
    );
  }

  protected updateActivityDateSort(event: Event): void {
    this.applyActivityToolbarSort(
      'inspectionDate',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected updateActivityCandidateSort(event: Event): void {
    this.applyActivityToolbarSort(
      'candidateName',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected updateActivityPrioritySort(event: Event): void {
    this.applyActivityToolbarSort(
      'priority',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected getSortIndicator(column: SortColumn): string {
    const current = this.activitySort();
    if (current.column !== column) {
      return '↕';
    }
    return current.direction === 'asc' ? '↑' : '↓';
  }

  protected getAriaSort(column: SortColumn): 'none' | 'ascending' | 'descending' {
    const current = this.activitySort();
    if (current.column !== column) {
      return 'none';
    }
    return current.direction === 'asc' ? 'ascending' : 'descending';
  }

  protected formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value));
  }

  protected formatDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
    }).format(new Date(value));
  }

  private compareByColumn(
    a: ActivityRow,
    b: ActivityRow,
    column: SortColumn,
    direction: SortDirection,
  ): number {
    let result = 0;

    if (column === 'priority') {
      result = a.priority - b.priority;
    } else if (column === 'inspectionDate' || column === 'nextDue') {
      result = Date.parse(a[column]) - Date.parse(b[column]);
    } else {
      result = a[column].localeCompare(b[column], undefined, { sensitivity: 'base' });
    }

    return direction === 'asc' ? result : -result;
  }

  private applyActivityToolbarSort(field: SortColumn, selection: ToolbarSortSelection): void {
    if (selection === 'default') {
      this.activitySort.set({
        column: 'inspectionDate',
        direction: 'desc',
      });
      return;
    }

    this.activitySort.set({
      column: field,
      direction: selection,
    });
  }

  private dayDifferenceFromToday(value: string): number {
    const dueDate = new Date(value);
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    return Math.floor(
      (startOfDue.getTime() - startOfToday.getTime()) / DashboardComponent.millisecondsPerDay,
    );
  }

  private isActiveCandidate(endDate: string | null): boolean {
    if (!endDate) {
      return true;
    }

    return this.startOfDay(new Date(endDate)).getTime() >= this.startOfDay(new Date()).getTime();
  }

  private getCandidateMaturity(startDate: string): CandidateMaturity {
    const startedAt = this.startOfDay(new Date(startDate));
    const daysSinceStart = this.dayDifference(startedAt, this.startOfDay(new Date()));
    return daysSinceStart <= 730 ? 'New' : 'Established';
  }

  private dayDifference(start: Date, end: Date): number {
    return Math.floor((end.getTime() - start.getTime()) / DashboardComponent.millisecondsPerDay);
  }

  private isPendingStatus(status: InspectionStatus): boolean {
    return status === 'Planned';
  }

  private parseInspectionDateTime(inspection: InspectionRecord): Date {
    const [month, day, year] = inspection.appointmentDate.split('-').map(Number);
    const timeParts = inspection.appointmentTime.match(/^(\d{1,2}):(\d{2})(am|pm)/i);

    if (!timeParts) {
      return new Date(year, month - 1, day);
    }

    const [, rawHours, rawMinutes, meridiem] = timeParts;
    let hours = Number(rawHours) % 12;
    if (meridiem.toLowerCase() === 'pm') {
      hours += 12;
    }

    return new Date(year, month - 1, day, hours, Number(rawMinutes));
  }

  private startOfDay(value: Date): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
}
