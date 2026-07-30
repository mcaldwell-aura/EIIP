import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CandidateStoreService } from './candidate-store.service';
import { type CandidateType } from './candidates.data';
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

type VisibilityScope = 'candidateMaturity' | 'candidateType';

type VisibilitySplitLabel = {
  primary: string;
  secondary: string;
};

type VisibilitySplitDatum = {
  label: string;
  total: number;
  primaryCount: number;
  secondaryCount: number;
};

type CandidateMaturity = 'New' | 'Established';

type CandidateMaturitySummaryRow = {
  label: string;
  value: number;
};

type CandidateTypeSummaryRow = {
  label: CandidateType;
  value: number;
};

type InspectionResultByMaturityDatum = {
  label: string;
  newCount: number;
  establishedCount: number;
};

type DueBucketLabel = 'Overdue' | '0-30 Days' | '31-60 Days' | '61-90 Days' | 'Date not set';

type DueBucketRow = {
  label: DueBucketLabel;
  count: number;
  tone: 'overdue' | 'soon' | 'upcoming' | 'later' | 'unset';
};

type InspectionTableRow = {
  candidateId: string;
  candidateName: string;
  inspector: string;
  appointmentDate: string;
  nextDue: string;
  priority: number;
  inspectionReason: string;
  inspectionStatus: InspectionStatus;
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
  candidateId: string;
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

  private static readonly upcomingRowsPerPage = 4;

  private static readonly recentRowsPerPage = 5;

  private readonly excludedStatuses = new Set<ActivityStatus>(['Planned', 'Scheduled', 'Canceled']);

  protected readonly visibilityScope = signal<VisibilityScope>('candidateMaturity');

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

  protected readonly candidateTypeSummaryRows = computed<CandidateTypeSummaryRow[]>(() => {
    const activeCandidates = this.candidateStore
      .candidates()
      .filter((candidate) => this.isActiveCandidate(candidate.endDate));
    const individualCandidates = activeCandidates.filter(
      (candidate) => candidate.candidateType === 'Individual',
    ).length;
    const organizationCandidates = activeCandidates.length - individualCandidates;

    return [
      { label: 'Individual', value: individualCandidates },
      { label: 'Organization', value: organizationCandidates },
    ];
  });

  protected readonly activeCandidateBreakdownRows = computed<CandidateMaturitySummaryRow[]>(() => {
    if (this.visibilityScope() === 'candidateMaturity') {
      return this.candidateMaturitySummaryRows().slice(1);
    }

    return this.candidateTypeSummaryRows().map((row) => ({
      label: row.label,
      value: row.value,
    }));
  });

  protected readonly activeCandidateTotal = computed(
    () => this.candidateMaturitySummaryRows()[0].value,
  );

  protected readonly activeCandidateCircleGradient = computed(() => {
    const total = this.activeCandidateTotal();
    if (total <= 0) {
      return 'conic-gradient(#d8e0f2 0deg 360deg)';
    }

    const scope = this.visibilityScope();
    let primaryCount = 0;
    let secondaryCount = 0;
    let primaryColor = '#3f83f8';
    let secondaryColor = '#1d4ed8';

    if (scope === 'candidateMaturity') {
      const [newCandidates, establishedCandidates] = this.candidateMaturitySummaryRows().slice(1);
      primaryCount = newCandidates?.value ?? 0;
      secondaryCount = establishedCandidates?.value ?? 0;
      primaryColor = '#3f83f8';
      secondaryColor = '#1d4ed8';
    } else {
      const [individualCandidates, organizationCandidates] = this.candidateTypeSummaryRows();
      primaryCount = individualCandidates?.value ?? 0;
      secondaryCount = organizationCandidates?.value ?? 0;
      // Keep candidate-type donut colors exactly aligned with bar/legend colors in SCSS.
      primaryColor = '#4f79b3';
      secondaryColor = '#2f5d93';
    }

    const segmentTotal = Math.max(1, primaryCount + secondaryCount);
    const primaryDegrees = (primaryCount / segmentTotal) * 360;

    return `conic-gradient(${primaryColor} 0deg ${primaryDegrees}deg, ${secondaryColor} ${primaryDegrees}deg 360deg)`;
  });

  protected readonly visibilityLegendLabels = computed<VisibilitySplitLabel>(() => {
    if (this.visibilityScope() === 'candidateMaturity') {
      return {
        primary: 'New',
        secondary: 'Established',
      };
    }

    return {
      primary: 'Individual',
      secondary: 'Organization',
    };
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
    let inspectionsToBeAssigned = 0;
    let inspectionsToBeCompleted = 0;

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

      if (inspection.assignedInspector === 'Unassigned' && (isPending || isScheduled)) {
        inspectionsToBeAssigned += 1;
      }

      if (inspection.assignedInspector !== 'Unassigned' && (isPending || isScheduled)) {
        inspectionsToBeCompleted += 1;
      }
    }

    return [
      { label: 'Assigned to Me', value: assignedToMe },
      { label: 'Due Today', value: dueToday },
      { label: 'Pending Inspections', value: pendingInspections },
      { label: 'Scheduled Inspections', value: scheduledInspections },
      { label: 'Completed this week', value: completedThisWeek },
      { label: 'Missed Inspections', value: missedInspections },
      { label: 'Inspections to be Assigned', value: inspectionsToBeAssigned },
      { label: 'Inspections to be Completed', value: inspectionsToBeCompleted },
    ];
  });

  protected readonly inspectionResultTotals = signal<ChartDatum[]>([
    { label: 'Excellent', value: 23 },
    { label: 'Good', value: 26 },
    { label: 'Satisfactory', value: 12 },
    { label: 'Marginal', value: 24 },
    { label: 'Unsatisfactory', value: 18 },
  ]);

  protected readonly reasonsForInspectionTotals = signal<ChartDatum[]>([
    { label: 'Change', value: 10 },
    { label: 'Original', value: 15 },
    { label: 'ReExam', value: 22 },
    { label: 'Reinstatement', value: 24 },
    { label: 'Periodic', value: 21 },
  ]);

  protected readonly inspectionResultsChartData = computed<VisibilitySplitDatum[]>(() =>
    this.toVisibilitySplitData(this.inspectionResultTotals()),
  );

  protected readonly reasonsForInspectionChartData = computed<VisibilitySplitDatum[]>(() =>
    this.toVisibilitySplitData(this.reasonsForInspectionTotals()),
  );

  protected readonly inspectionResultsChartMax = computed(() =>
    Math.max(1, ...this.inspectionResultsChartData().map((item) => item.total)),
  );

  protected readonly reasonsForInspectionChartMax = computed(() =>
    Math.max(1, ...this.reasonsForInspectionChartData().map((item) => item.total)),
  );

  protected readonly dueBuckets = signal<DueBucketRow[]>([
    { label: 'Overdue', count: 12, tone: 'overdue' },
    { label: '0-30 Days', count: 4, tone: 'soon' },
    { label: '31-60 Days', count: 21, tone: 'upcoming' },
    { label: '61-90 Days', count: 6, tone: 'later' },
    { label: 'Date not set', count: 15, tone: 'unset' },
  ]);

  protected readonly dueBucketsForCards = computed(() =>
    this.dueBuckets().filter((bucket) => bucket.label !== 'Date not set'),
  );

  protected readonly upcomingInspectionsInNext30Days = signal<InspectionTableRow[]>([
    {
      candidateId: 'organization-1',
      candidateName: 'Living Trust for Michelle T.',
      inspector: 'Brent Julius, Colton Patch',
      appointmentDate: '07/29/2026 02:45 PM',
      nextDue: '06/25/2026',
      priority: 93,
      inspectionReason: 'Change',
      inspectionStatus: 'Scheduled',
    },
    {
      candidateId: 'organization-2',
      candidateName: 'Scooby Doo Detective Agency',
      inspector: 'Colton Patch, Dana Reed',
      appointmentDate: '07/30/2026 10:16 AM',
      nextDue: '06/01/2026',
      priority: 88,
      inspectionReason: 'Change',
      inspectionStatus: 'Scheduled',
    },
    {
      candidateId: 'organization-3',
      candidateName: 'First Special Cars LLC',
      inspector: 'Dana Reed, Ezra Zheng',
      appointmentDate: '08/05/2026 01:38 PM',
      nextDue: '08/29/2026',
      priority: 71,
      inspectionReason: 'Change',
      inspectionStatus: 'Scheduled',
    },
    {
      candidateId: 'individual-1',
      candidateName: 'Jose Maria OBrien-Nunez',
      inspector: 'Grant Hawkes',
      appointmentDate: '08/19/2026 09:06 PM',
      nextDue: '09/22/2026',
      priority: 64,
      inspectionReason: 'Change',
      inspectionStatus: 'Planned',
    },
  ]);

  protected readonly activityRows = signal<ActivityRow[]>([
    {
      candidateId: 'individual-1',
      candidateName: 'Alyssa Campos',
      inspectionDate: '2026-07-27T14:20:00',
      nextDue: '2026-09-16',
      priority: 93,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Completed',
      inspectionType: 'Overt',
    },
    {
      candidateId: 'individual-2',
      candidateName: 'Brandon Lin',
      inspectionDate: '2026-07-22T09:45:00',
      nextDue: '2026-09-12',
      priority: 97,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'In Review',
      inspectionType: 'Overt',
    },
    {
      candidateId: 'individual-3',
      candidateName: 'Carlos Vega',
      inspectionDate: '2026-07-19T08:15:00',
      nextDue: '2026-09-10',
      priority: 98,
      inspectionReason: 'Re-Examination',
      inspectionStatus: 'Closed',
      inspectionType: 'Covert',
    },
    {
      candidateId: 'individual-4',
      candidateName: 'Diana Reeves',
      inspectionDate: '2026-07-14T15:30:00',
      nextDue: '2026-09-05',
      priority: 97,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'In Review',
      inspectionType: 'Overt',
    },
    {
      candidateId: 'individual-5',
      candidateName: 'Ethan Patel',
      inspectionDate: '2026-07-09T13:05:00',
      nextDue: '2026-08-30',
      priority: 98,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Escalated',
      inspectionType: 'Covert',
    },
    {
      candidateId: 'individual-6',
      candidateName: 'Farah Nouri',
      inspectionDate: '2026-07-07T11:40:00',
      nextDue: '2026-08-25',
      priority: 91,
      inspectionReason: 'Biennial',
      inspectionStatus: 'Completed',
      inspectionType: 'Overt',
    },
    {
      candidateId: 'individual-7',
      candidateName: 'Grace Ito',
      inspectionDate: '2026-07-03T10:10:00',
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

  protected readonly upcomingCurrentPage = signal(1);

  protected readonly recentCurrentPage = signal(1);

  protected readonly upcomingTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.upcomingInspectionsInNext30Days().length / DashboardComponent.upcomingRowsPerPage,
      ),
    ),
  );

  protected readonly recentTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.filteredSortedActivityRows().length / DashboardComponent.recentRowsPerPage),
    ),
  );

  protected readonly pagedUpcomingInspections = computed(() => {
    const allRows = this.upcomingInspectionsInNext30Days();
    const totalPages = Math.max(
      1,
      Math.ceil(allRows.length / DashboardComponent.upcomingRowsPerPage),
    );
    const page = Math.min(this.upcomingCurrentPage(), totalPages);
    const start = (page - 1) * DashboardComponent.upcomingRowsPerPage;
    return allRows.slice(start, start + DashboardComponent.upcomingRowsPerPage);
  });

  protected readonly pagedRecentActivityRows = computed(() => {
    const allRows = this.filteredSortedActivityRows();
    const totalPages = Math.max(
      1,
      Math.ceil(allRows.length / DashboardComponent.recentRowsPerPage),
    );
    const page = Math.min(this.recentCurrentPage(), totalPages);
    const start = (page - 1) * DashboardComponent.recentRowsPerPage;
    return allRows.slice(start, start + DashboardComponent.recentRowsPerPage);
  });

  protected readonly upcomingPageNumbers = computed(() =>
    Array.from({ length: this.upcomingTotalPages() }, (_, index) => index + 1),
  );

  protected readonly recentPageNumbers = computed(() =>
    Array.from({ length: this.recentTotalPages() }, (_, index) => index + 1),
  );

  protected readonly shouldShowUpcomingPagination = computed(() => this.upcomingTotalPages() > 1);

  protected readonly shouldShowRecentPagination = computed(() => this.recentTotalPages() > 1);

  protected setVisibilityScope(scope: VisibilityScope): void {
    this.visibilityScope.set(scope);
  }

  protected setUpcomingPage(page: number): void {
    const safePage = Math.min(Math.max(1, page), this.upcomingTotalPages());
    this.upcomingCurrentPage.set(safePage);
  }

  protected setRecentPage(page: number): void {
    const safePage = Math.min(Math.max(1, page), this.recentTotalPages());
    this.recentCurrentPage.set(safePage);
  }

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

  protected getStatusPillClass(status: InspectionStatus | ActivityStatus): string {
    if (status === 'Escalated') {
      return 'status-pill is-danger';
    }

    if (status === 'In Review') {
      return 'status-pill is-info';
    }

    if (status === 'Planned' || status === 'Scheduled' || status === 'Pending') {
      return 'status-pill is-warning';
    }

    if (status === 'Canceled') {
      return 'status-pill is-neutral';
    }

    return 'status-pill is-success';
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
    return status === 'Planned' || status === 'Pending';
  }

  private toVisibilitySplitData(source: ChartDatum[]): VisibilitySplitDatum[] {
    const [primaryWeight, secondaryWeight] = this.getVisibilityWeights(this.visibilityScope());
    return source.map((item) => {
      const primaryCount = Math.round(item.value * primaryWeight);
      const secondaryCount = Math.max(0, item.value - primaryCount);
      return {
        label: item.label,
        total: item.value,
        primaryCount,
        secondaryCount,
      };
    });
  }

  private getVisibilityWeights(scope: VisibilityScope): [number, number] {
    if (scope === 'candidateMaturity') {
      const rows = this.candidateMaturitySummaryRows().slice(1);
      const total = rows.reduce((sum, row) => sum + row.value, 0);
      if (total === 0) {
        return [0.5, 0.5];
      }

      return [rows[0].value / total, rows[1].value / total];
    }

    const rows = this.candidateTypeSummaryRows();
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    if (total === 0) {
      return [0.5, 0.5];
    }

    return [rows[0].value / total, rows[1].value / total];
  }

  private parseFlexibleDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parts = normalized.split(/[-/]/);
    if (parts.length !== 3) {
      return null;
    }

    const [first, second, third] = parts;
    let year = 0;
    let month = 0;
    let day = 0;

    if (first.length === 4) {
      year = Number(first);
      month = Number(second);
      day = Number(third);
    } else {
      month = Number(first);
      day = Number(second);
      const rawYear = Number(third);
      year = third.length === 2 ? 2000 + rawYear : rawYear;
    }

    if ([year, month, day].some((part) => Number.isNaN(part))) {
      return null;
    }

    const parsedDate = new Date(year, month - 1, day);
    if (
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getDate() !== day
    ) {
      return null;
    }

    return parsedDate;
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
