import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LOCATIONS } from './locations.data';
import { NavMenuService } from './nav-menu.service';
import { type InspectionRecord, type InspectionStatus } from './inspection-data';
import {
  InspectionStoreService,
  type PriorityScoreDetail,
  type PriorityScoreFactor,
} from './inspection-store.service';
import { getPriorityTier, getPriorityTierLabel, type PriorityTier } from './priority-score.util';
import { USERS } from './users.data';

import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';

type DueDateFilter = 'all' | 'next-7-days' | 'next-30-days' | 'after-30-days';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type SortField =
  | 'subjectName'
  | 'nextDue'
  | 'priority'
  | 'inspectionStatus'
  | 'inspectionReason'
  | 'inspectionType'
  | 'appointment';
type SortDirection = 'asc' | 'desc';
type ToolbarSortSelection = 'default' | 'asc' | 'desc' | 'attention-first';
type InspectionReasonOption = 'Change' | 'Original' | 'ReExam' | 'Reinstatement' | 'Periodic';
type InspectionTypeOption = 'Overt' | 'Covert';
type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type InspectionWorkflowStatus = 'New' | 'Pending' | 'Closed';
type InspectionStatusReason =
  | 'Created'
  | 'Not Assigned'
  | 'Not Scheduled'
  | 'Scheduled'
  | 'Appointment Complete'
  | 'Completed'
  | 'Canceled';

type InspectionPlanRow = {
  inspectionId: string;
  subjectId: string;
  subjectName: string;
  nextDue: string;
  priority: number;
  inspectionStatus: InspectionStatus;
  inspectionWorkflowStatus: InspectionWorkflowStatus;
  inspectionStatusReason: InspectionStatusReason;
  inspectionStatusDisplay: string;
  inspectionReason: string;
  inspectionType: InspectionRecord['inspectionType'];
  appointmentDate: string;
  appointmentText: string;
  appointmentTooltip: string | null;
  appointmentTimestamp: number | null;
  canCreateInspection: boolean;
};

type NewInspectionAppointmentDraft = {
  dateTime: string;
  location: string;
};

type AppointmentSlot = {
  time: string;
  examType: string;
  inspectionType: InspectionTypeOption;
  location: string;
  auditorName: string;
};

const AVAILABLE_APPOINTMENT_SLOTS: readonly AppointmentSlot[] = [
  {
    time: '9:00 AM',
    examType: 'CDL Exam',
    inspectionType: 'Overt',
    location: 'Austin Assessment Center',
    auditorName: 'Campos',
  },
  {
    time: '10:30 AM',
    examType: 'CDL Exam',
    inspectionType: 'Overt',
    location: 'Harris Central Campus',
    auditorName: 'Lin',
  },
  {
    time: '11:45 AM',
    examType: 'CDL Exam',
    inspectionType: 'Covert',
    location: 'Dallas Metro Hub',
    auditorName: 'Reeves',
  },
  {
    time: '1:00 PM',
    examType: 'CDL Exam',
    inspectionType: 'Overt',
    location: 'Fort Worth North Site',
    auditorName: 'Patel',
  },
  {
    time: '2:30 PM',
    examType: 'CDL Exam',
    inspectionType: 'Covert',
    location: 'Collin Regional Site',
    auditorName: 'Turner',
  },
];

const PRIORITY_RING_RADIUS = 38;
const PRIORITY_RING_CIRCUMFERENCE = 2 * Math.PI * PRIORITY_RING_RADIUS;
const HISTORY_CHART_WIDTH = 760;
const HISTORY_CHART_HEIGHT = 96;
const HISTORY_CHART_AXIS_TICKS = [100, 75, 50, 25, 0] as const;

type HistoryChartPoint = {
  x: number;
  y: number;
  score: number;
  tooltip: string;
};

type HistoryHoverZone = {
  x: number;
  width: number;
  tooltip: string;
};

type HistoryTooltipState = {
  label: string;
  left: number;
  top: number;
};

@Component({
  selector: 'app-inspection-overview',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    DatePickerModule,
    DialogModule,
    RippleModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspection-overview.component.html',
  styleUrl: './inspection-overview.component.scss',
})
export class InspectionOverviewComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly router = inject(Router);
  private readonly inspectionStore = inject(InspectionStoreService);

  protected readonly rows = this.inspectionStore.inspections;
  protected readonly canCreateInspection = signal(true);
  protected readonly dueDateFilter = signal<DueDateFilter>('all');
  protected readonly priorityFilter = signal<PriorityFilter>('all');
  protected readonly statusFilter = signal<InspectionStatus | 'all'>('all');
  protected readonly activeSortField = signal<SortField>('priority');
  protected readonly activeSortDirection = signal<SortDirection>('desc');
  protected readonly planRows = computed(() => this.buildPlanRows(this.rows()));
  protected readonly selectedPriorityDetail = signal<PriorityScoreDetail | null>(null);
  protected readonly showAllPriorityFactors = signal(false);
  protected readonly expandedPriorityFactors = signal<string[]>([]);
  protected readonly animatedPriorityScore = signal(0);
  protected readonly priorityHistoryTooltip = signal<HistoryTooltipState | null>(null);
  protected readonly respectsReducedMotion = signal(this.detectReducedMotionPreference());
  protected readonly isNewInspectionModalOpen = signal(false);
  protected readonly newInspectionCandidate = signal<InspectionPlanRow | null>(null);
  protected readonly inspectionReasonInput = signal<InspectionReasonOption | ''>('');
  protected readonly inspectionTypeInput = signal<InspectionTypeOption | ''>('');
  protected readonly inspectorSearchTerm = signal('');
  protected readonly selectedInspectors = signal<string[]>([]);
  protected readonly appointmentDateTimeInput = signal('');
  protected readonly appointmentLocationInput = signal('');
  protected readonly stagedAppointments = signal<NewInspectionAppointmentDraft[]>([]);
  protected readonly selectedAppointmentSlot = signal<AppointmentSlot | null>(null);
  protected readonly availableAppointmentSlots: readonly AppointmentSlot[] =
    AVAILABLE_APPOINTMENT_SLOTS;
  private priorityAnimationTimer: ReturnType<typeof setTimeout> | null = null;
  private priorityDialogTrigger: HTMLButtonElement | null = null;
  protected readonly newInspectionValidationMessage = signal('');
  protected readonly inspectionReasonOptions: readonly InspectionReasonOption[] = [
    'Change',
    'Original',
    'ReExam',
    'Reinstatement',
    'Periodic',
  ];
  protected readonly inspectionTypeOptions: readonly InspectionTypeOption[] = ['Overt', 'Covert'];
  protected readonly dueDateFilterOptions: SelectOption<DueDateFilter>[] = [
    { label: 'Due Date: All', value: 'all' },
    { label: 'Due Date: Next 7 Days', value: 'next-7-days' },
    { label: 'Due Date: 8 to 30 Days', value: 'next-30-days' },
    { label: 'Due Date: After 30 Days', value: 'after-30-days' },
  ];
  protected readonly priorityFilterOptions: SelectOption<PriorityFilter>[] = [
    { label: 'Priority Score: All', value: 'all' },
    { label: 'Priority Score: High', value: 'high' },
    { label: 'Priority Score: Medium', value: 'medium' },
    { label: 'Priority Score: Low', value: 'low' },
  ];
  protected readonly statusFilterOptions: SelectOption<InspectionStatus | 'all'>[] = [
    { label: 'Status: All', value: 'all' },
    { label: 'Status: Pending', value: 'Pending' },
    { label: 'Status: Scheduled', value: 'Scheduled' },
    { label: 'Status: Planned', value: 'Planned' },
    { label: 'Status: Good', value: 'Good' },
    { label: 'Status: Satisfactory', value: 'Satisfactory' },
    { label: 'Status: Unsatisfactory', value: 'Unsatisfactory' },
  ];
  protected readonly prioritySortOptions: SelectOption<ToolbarSortSelection>[] = [
    { label: 'Priority Score: Highest First', value: 'default' },
    { label: 'Priority Score: Highest First', value: 'desc' },
    { label: 'Priority Score: Lowest First', value: 'asc' },
  ];
  protected readonly statusSortOptions: SelectOption<ToolbarSortSelection>[] = [
    { label: 'Status: Default', value: 'default' },
    { label: 'Status: A to Z', value: 'asc' },
    { label: 'Status: Z to A', value: 'desc' },
  ];
  protected readonly appointmentSortOptions: SelectOption<ToolbarSortSelection>[] = [
    { label: 'Appointment: Default', value: 'default' },
    { label: 'Appointment: Soonest First', value: 'asc' },
    { label: 'Appointment: Latest First', value: 'desc' },
  ];
  protected readonly inspectionReasonDropdownOptions: SelectOption<InspectionReasonOption>[] =
    this.inspectionReasonOptions.map((reason) => ({ label: reason, value: reason }));
  protected readonly inspectionTypeDropdownOptions: SelectOption<InspectionTypeOption>[] =
    this.inspectionTypeOptions.map((inspectionType) => ({
      label: inspectionType,
      value: inspectionType,
    }));
  protected readonly activeInspectorNames = computed(() => {
    const searchTerm = this.inspectorSearchTerm().trim().toLowerCase();

    return USERS.filter((user) => user.active)
      .map((user) => `${user.firstName} ${user.lastName}`)
      .filter((name) => searchTerm.length === 0 || name.toLowerCase().includes(searchTerm))
      .sort((leftName, rightName) =>
        leftName.localeCompare(rightName, undefined, { sensitivity: 'base' }),
      );
  });
  protected readonly activeLocationNames = LOCATIONS.filter((location) => location.active)
    .map((location) => location.locationName)
    .sort((leftName, rightName) =>
      leftName.localeCompare(rightName, undefined, { sensitivity: 'base' }),
    );
  protected readonly visibleRows = computed(() => {
    const dueDateFilter = this.dueDateFilter();
    const priorityFilter = this.priorityFilter();
    const statusFilter = this.statusFilter();
    const activeSortField = this.activeSortField();
    const activeSortDirection = this.activeSortDirection();

    const filteredRows = this.planRows().filter((row) => {
      const dueDate = this.parseDate(row.nextDue);
      const daysUntilDue = this.dayDifferenceFromToday(dueDate);
      const matchesDueDate =
        dueDateFilter === 'all' ||
        (dueDateFilter === 'next-7-days' && daysUntilDue <= 7) ||
        (dueDateFilter === 'next-30-days' && daysUntilDue > 7 && daysUntilDue <= 30) ||
        (dueDateFilter === 'after-30-days' && daysUntilDue > 30);
      const matchesPriority =
        priorityFilter === 'all' ||
        (priorityFilter === 'high' && row.priority >= 85) ||
        (priorityFilter === 'medium' && row.priority >= 50 && row.priority < 85) ||
        (priorityFilter === 'low' && row.priority < 50);
      const matchesStatus = statusFilter === 'all' || row.inspectionStatus === statusFilter;

      return matchesDueDate && matchesPriority && matchesStatus;
    });

    return [...filteredRows].sort((leftRow, rightRow) => {
      const directionMultiplier = activeSortDirection === 'asc' ? 1 : -1;

      switch (activeSortField) {
        case 'priority':
          return (leftRow.priority - rightRow.priority) * directionMultiplier;
        case 'nextDue':
          return (
            (this.parseDate(leftRow.nextDue).getTime() -
              this.parseDate(rightRow.nextDue).getTime()) *
            directionMultiplier
          );
        case 'appointment': {
          if (leftRow.appointmentTimestamp === null && rightRow.appointmentTimestamp === null) {
            return 0;
          }

          if (leftRow.appointmentTimestamp === null) {
            return 1;
          }

          if (rightRow.appointmentTimestamp === null) {
            return -1;
          }

          return (
            (leftRow.appointmentTimestamp - rightRow.appointmentTimestamp) * directionMultiplier
          );
        }
        case 'inspectionStatus':
          return (
            leftRow.inspectionStatus.localeCompare(rightRow.inspectionStatus) * directionMultiplier
          );
        case 'inspectionType':
          return (
            leftRow.inspectionType.localeCompare(rightRow.inspectionType) * directionMultiplier
          );
        case 'inspectionReason':
          return (
            leftRow.inspectionReason.localeCompare(rightRow.inspectionReason) * directionMultiplier
          );
        case 'subjectName':
        default:
          return leftRow.subjectName.localeCompare(rightRow.subjectName) * directionMultiplier;
      }
    });
  });
  protected readonly selectedPrioritySort = computed<ToolbarSortSelection>(() => {
    if (this.activeSortField() !== 'priority') {
      return 'default';
    }

    return this.activeSortDirection();
  });
  protected readonly selectedStatusSort = computed<ToolbarSortSelection>(() => {
    if (this.activeSortField() !== 'inspectionStatus') {
      return 'default';
    }

    return this.activeSortDirection();
  });
  protected readonly selectedAppointmentSort = computed<ToolbarSortSelection>(() => {
    if (this.activeSortField() !== 'appointment') {
      return 'default';
    }

    return this.activeSortDirection();
  });
  protected readonly selectedPriorityTier = computed<PriorityTier | null>(() => {
    const detail = this.selectedPriorityDetail();
    if (!detail) {
      return null;
    }

    return getPriorityTier(detail.score);
  });
  protected readonly selectedPriorityTierLabel = computed(() => {
    const tier = this.selectedPriorityTier();
    return tier ? getPriorityTierLabel(tier) : '';
  });
  protected readonly selectedPriorityTierColor = computed(() => {
    const tier = this.selectedPriorityTier();

    if (tier === 'high') {
      return 'var(--accent-deep)';
    }

    if (tier === 'medium') {
      return 'var(--accent)';
    }

    return 'var(--text-soft)';
  });
  protected readonly historyChartWidth = HISTORY_CHART_WIDTH;
  protected readonly historyChartHeight = HISTORY_CHART_HEIGHT;
  protected readonly priorityRingCircumference = PRIORITY_RING_CIRCUMFERENCE;
  protected readonly priorityRingDashOffset = computed(() => {
    const boundedScore = Math.max(0, Math.min(100, this.animatedPriorityScore()));
    return PRIORITY_RING_CIRCUMFERENCE * (1 - boundedScore / 100);
  });
  protected readonly visiblePriorityFactors = computed<PriorityScoreFactor[]>(() => {
    const detail = this.selectedPriorityDetail();
    if (!detail) {
      return [];
    }

    const rankedFactors = detail.factors
      .map((factor, index) => ({ factor, index }))
      .sort((left, right) => {
        const leftHasPoints = left.factor.points > 0 ? 1 : 0;
        const rightHasPoints = right.factor.points > 0 ? 1 : 0;

        if (leftHasPoints !== rightHasPoints) {
          return rightHasPoints - leftHasPoints;
        }

        if (left.factor.points !== right.factor.points) {
          return right.factor.points - left.factor.points;
        }

        return left.index - right.index;
      })
      .map((entry) => entry.factor);

    if (this.showAllPriorityFactors()) {
      return rankedFactors;
    }

    return rankedFactors.filter((factor) => factor.points > 0);
  });
  protected readonly hasPriorityFactors = computed(() => {
    return this.visiblePriorityFactors().length > 0;
  });
  protected readonly canTogglePriorityFactorsView = computed(() => {
    const detail = this.selectedPriorityDetail();
    if (!detail) {
      return false;
    }

    return detail.factors.some((factor) => factor.points <= 0);
  });
  protected readonly priorityHistoryPath = computed(() => {
    const detail = this.selectedPriorityDetail();
    if (!detail || detail.scoreHistory.length === 0) {
      return '';
    }

    return this.buildHistoryPath(detail.scoreHistory.map((entry) => entry.score));
  });
  protected readonly priorityHistoryPoints = computed<HistoryChartPoint[]>(() => {
    const detail = this.selectedPriorityDetail();
    if (!detail || detail.scoreHistory.length === 0) {
      return [];
    }

    const scores = detail.scoreHistory.map((entry) => entry.score);
    const points = this.buildHistoryPoints(scores);

    return points.map((point, index) => {
      const rawScore = scores[index] ?? 0;
      const boundedScore = Math.max(0, Math.min(100, rawScore));
      const entry = detail.scoreHistory[index];
      const label = entry ? this.formatHistoryDate(entry.date) : 'Unknown date';
      return {
        ...point,
        score: boundedScore,
        tooltip: `${label}: ${boundedScore}`,
      };
    });
  });
  protected readonly priorityHistoryGuideLines = computed(() =>
    HISTORY_CHART_AXIS_TICKS.map((score) => ({
      score,
      y: this.scoreToHistoryY(score),
    })),
  );
  protected readonly priorityHistoryHoverZones = computed<HistoryHoverZone[]>(() => {
    const points = this.priorityHistoryPoints();
    if (points.length === 0) {
      return [];
    }

    return points.map((point, index) => {
      const previousPointX = index > 0 ? points[index - 1].x : point.x;
      const nextPointX = index < points.length - 1 ? points[index + 1].x : point.x;
      const leftBoundary = index === 0 ? 0 : (previousPointX + point.x) / 2;
      const rightBoundary =
        index === points.length - 1 ? HISTORY_CHART_WIDTH : (point.x + nextPointX) / 2;
      const width = Math.max(8, rightBoundary - leftBoundary);

      return {
        x: leftBoundary,
        width,
        tooltip: point.tooltip,
      };
    });
  });
  protected readonly priorityHistoryMonthLabels = computed(() => {
    const detail = this.selectedPriorityDetail();
    if (!detail || detail.scoreHistory.length === 0) {
      return [] as string[];
    }

    const uniqueMonths = new Set<string>();

    for (const entry of detail.scoreHistory) {
      const monthLabel = this.formatHistoryMonth(entry.date);
      if (monthLabel) {
        uniqueMonths.add(monthLabel);
      }
    }

    return Array.from(uniqueMonths);
  });
  protected readonly canSaveNewInspection = computed(
    () =>
      this.newInspectionCandidate() !== null &&
      this.inspectionReasonInput().length > 0 &&
      this.inspectionTypeInput().length > 0,
  );
  protected get priorityDialogVisible(): boolean {
    return this.selectedPriorityDetail() !== null;
  }

  protected set priorityDialogVisible(visible: boolean) {
    if (!visible) {
      this.closePriorityModal();
    }
  }

  protected get newInspectionDialogVisible(): boolean {
    return this.isNewInspectionModalOpen();
  }

  protected set newInspectionDialogVisible(visible: boolean) {
    if (!visible) {
      this.closeNewInspectionModal();
      return;
    }

    this.isNewInspectionModalOpen.set(true);
  }

  protected get appointmentDateTimeValue(): Date | null {
    const dateTime = this.appointmentDateTimeInput().trim();

    if (dateTime.length === 0) {
      return null;
    }

    const parsedDate = new Date(dateTime);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  protected set appointmentDateTimeValue(value: Date | null) {
    this.appointmentDateTimeInput.set(value ? this.formatDateTimeInputValue(value) : '');
  }

  protected requiresAttention(status: InspectionStatus): boolean {
    return status === 'Pending' || status === 'Planned' || status === 'Unsatisfactory';
  }

  protected updateDueDateFilter(event: Event): void {
    this.dueDateFilter.set((event.target as HTMLSelectElement).value as DueDateFilter);
  }

  protected updatePriorityFilter(event: Event): void {
    this.priorityFilter.set((event.target as HTMLSelectElement).value as PriorityFilter);
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as InspectionStatus | 'all');
  }

  protected updatePrioritySort(event: Event): void {
    this.applyToolbarSort(
      'priority',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected updateStatusSort(event: Event): void {
    this.applyToolbarSort(
      'inspectionStatus',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected updateAppointmentSort(event: Event): void {
    this.applyToolbarSort(
      'appointment',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected setSort(field: SortField): void {
    if (this.activeSortField() === field) {
      this.activeSortDirection.set(this.activeSortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.activeSortField.set(field);
    this.activeSortDirection.set(field === 'priority' ? 'desc' : 'asc');
  }

  protected sortIndicator(field: SortField): string {
    if (this.activeSortField() !== field) {
      return '↕';
    }

    return this.activeSortDirection() === 'asc' ? '↑' : '↓';
  }

  protected openPriorityModal(row: InspectionPlanRow, trigger: HTMLButtonElement): void {
    const detail = this.inspectionStore.getPriorityScoreDetail(row.subjectId, row.inspectionId);
    if (!detail) {
      return;
    }

    this.priorityDialogTrigger = trigger;
    this.showAllPriorityFactors.set(false);
    this.expandedPriorityFactors.set([]);
    this.selectedPriorityDetail.set(detail);
    this.startPriorityRingAnimation(detail.score);
  }

  protected closePriorityModal(): void {
    this.selectedPriorityDetail.set(null);
    this.showAllPriorityFactors.set(false);
    this.expandedPriorityFactors.set([]);
    this.animatedPriorityScore.set(0);
    this.priorityHistoryTooltip.set(null);

    if (this.priorityAnimationTimer) {
      clearTimeout(this.priorityAnimationTimer);
      this.priorityAnimationTimer = null;
    }

    if (this.priorityDialogTrigger) {
      const focusTarget = this.priorityDialogTrigger;
      this.priorityDialogTrigger = null;
      setTimeout(() => focusTarget.focus(), 0);
    }
  }

  protected openNewInspectionModal(row: InspectionPlanRow): void {
    this.closePriorityModal();
    this.newInspectionCandidate.set(row);
    this.inspectionReasonInput.set('');
    this.inspectionTypeInput.set('');
    this.inspectorSearchTerm.set('');
    this.selectedInspectors.set([]);
    this.appointmentDateTimeInput.set('');
    this.appointmentLocationInput.set('');
    this.stagedAppointments.set([]);
    this.selectedAppointmentSlot.set(null);
    this.newInspectionValidationMessage.set('');
    this.isNewInspectionModalOpen.set(true);
  }

  protected closeNewInspectionModal(): void {
    this.isNewInspectionModalOpen.set(false);
    this.newInspectionCandidate.set(null);
    this.inspectionReasonInput.set('');
    this.inspectionTypeInput.set('');
    this.inspectorSearchTerm.set('');
    this.selectedInspectors.set([]);
    this.appointmentDateTimeInput.set('');
    this.appointmentLocationInput.set('');
    this.stagedAppointments.set([]);
    this.selectedAppointmentSlot.set(null);
    this.newInspectionValidationMessage.set('');
  }

  protected updateInspectionReason(event: Event): void {
    this.inspectionReasonInput.set(
      (event.target as HTMLSelectElement).value as InspectionReasonOption | '',
    );
  }

  protected updateInspectionType(event: Event): void {
    this.inspectionTypeInput.set(
      (event.target as HTMLSelectElement).value as InspectionTypeOption | '',
    );
  }

  protected updateInspectorSearchTerm(event: Event): void {
    this.inspectorSearchTerm.set((event.target as HTMLInputElement).value);
  }

  protected toggleInspectorSelection(inspectorName: string): void {
    this.selectedInspectors.update((selectedInspectors) =>
      selectedInspectors.includes(inspectorName)
        ? selectedInspectors.filter((selectedInspector) => selectedInspector !== inspectorName)
        : [...selectedInspectors, inspectorName],
    );
  }

  protected isInspectorSelected(inspectorName: string): boolean {
    return this.selectedInspectors().includes(inspectorName);
  }

  protected updateAppointmentDateTime(event: Event): void {
    this.appointmentDateTimeInput.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentLocation(event: Event): void {
    this.appointmentLocationInput.set((event.target as HTMLInputElement).value);
  }

  protected selectAppointment(slot: AppointmentSlot): void {
    this.selectedAppointmentSlot.update((selectedSlot) => (selectedSlot === slot ? null : slot));

    const nextSelectedSlot = this.selectedAppointmentSlot();

    if (!nextSelectedSlot) {
      this.newInspectionValidationMessage.set('');
      return;
    }

    this.inspectionTypeInput.set(nextSelectedSlot.inspectionType);
    this.appointmentLocationInput.set(nextSelectedSlot.location);
    this.selectedInspectors.set(this.resolveInspectorSelection(nextSelectedSlot.auditorName));
    this.appointmentDateTimeValue = this.buildSelectedAppointmentDateTime(nextSelectedSlot.time);
    this.stagedAppointments.set([]);
    this.newInspectionValidationMessage.set('');
  }

  protected addAppointment(): void {
    const nextAppointment = this.buildDraftAppointment();

    if (!nextAppointment) {
      return;
    }

    this.stagedAppointments.update((appointments) => [...appointments, nextAppointment]);
    this.appointmentDateTimeInput.set('');
    this.appointmentLocationInput.set('');
  }

  protected removeAppointment(index: number): void {
    this.stagedAppointments.update((appointments) =>
      appointments.filter((_, appointmentIndex) => appointmentIndex !== index),
    );
  }

  protected async saveNewInspection(): Promise<void> {
    const candidate = this.newInspectionCandidate();
    const inspectionType = this.inspectionTypeInput();

    if (!candidate || !this.canSaveNewInspection() || !inspectionType) {
      this.newInspectionValidationMessage.set(
        'Inspection Reason and Inspection Type are required.',
      );
      return;
    }

    const hasDraftAppointmentInput =
      this.appointmentDateTimeInput().trim().length > 0 ||
      this.appointmentLocationInput().trim().length > 0;

    let draftAppointment: NewInspectionAppointmentDraft | null = null;

    if (hasDraftAppointmentInput) {
      draftAppointment = this.buildDraftAppointment(false);
      if (draftAppointment === null) {
        return;
      }
    } else {
      this.newInspectionValidationMessage.set('');
    }

    const appointments = draftAppointment
      ? [...this.stagedAppointments(), draftAppointment]
      : [...this.stagedAppointments()];
    const inspectionId = this.inspectionStore.createInspection({
      subjectId: candidate.subjectId,
      subjectName: candidate.subjectName,
      nextDue: candidate.nextDue,
      priority: candidate.priority,
      inspectionReason: this.inspectionReasonInput(),
      inspectionType,
      assignedInspectors: this.selectedInspectors(),
      appointments,
    });

    this.closeNewInspectionModal();

    const didNavigate = await this.router.navigate([
      '/inspection-overview/inspection',
      inspectionId,
    ]);

    if (!didNavigate) {
      await this.router.navigateByUrl(`/inspection-overview/inspection/${inspectionId}`);
    }
  }

  protected priorityTier(priority: number): PriorityTier {
    return getPriorityTier(priority);
  }

  protected handleEscape(): void {
    if (this.isNewInspectionModalOpen()) {
      this.closeNewInspectionModal();
      return;
    }

    if (this.selectedPriorityDetail()) {
      this.closePriorityModal();
    }
  }

  protected formatPriorityPoints(points: number): string {
    return points > 0 ? `+${points}` : `${points}`;
  }

  protected showPriorityHistoryTooltip(
    event: MouseEvent,
    label: string,
    chartWrap: HTMLElement,
  ): void {
    this.priorityHistoryTooltip.set(this.buildPriorityHistoryTooltipState(event, label, chartWrap));
  }

  protected movePriorityHistoryTooltip(event: MouseEvent, chartWrap: HTMLElement): void {
    const tooltip = this.priorityHistoryTooltip();
    if (!tooltip) {
      return;
    }

    this.priorityHistoryTooltip.set(
      this.buildPriorityHistoryTooltipState(event, tooltip.label, chartWrap),
    );
  }

  protected hidePriorityHistoryTooltip(): void {
    this.priorityHistoryTooltip.set(null);
  }

  private startPriorityRingAnimation(score: number): void {
    if (this.priorityAnimationTimer) {
      clearTimeout(this.priorityAnimationTimer);
      this.priorityAnimationTimer = null;
    }

    if (this.respectsReducedMotion()) {
      this.animatedPriorityScore.set(score);
      return;
    }

    this.animatedPriorityScore.set(0);
    this.priorityAnimationTimer = setTimeout(() => {
      this.animatedPriorityScore.set(score);
      this.priorityAnimationTimer = null;
    }, 20);
  }

  private detectReducedMotionPreference(): boolean {
    return (
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private buildHistoryPath(scores: number[]): string {
    const points = this.buildHistoryPoints(scores);
    if (points.length === 0) {
      return '';
    }

    return points
      .map(
        (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      )
      .join(' ');
  }

  private buildHistoryPoints(scores: number[]): Array<{ x: number; y: number }> {
    if (scores.length === 0) {
      return [];
    }

    if (scores.length === 1) {
      const singleY =
        HISTORY_CHART_HEIGHT - (Math.max(0, Math.min(100, scores[0])) / 100) * HISTORY_CHART_HEIGHT;
      return [{ x: 0, y: singleY }];
    }

    return scores.map((score, index) => {
      const x = (index / (scores.length - 1)) * HISTORY_CHART_WIDTH;
      const y = this.scoreToHistoryY(score);
      return { x, y };
    });
  }

  private scoreToHistoryY(score: number): number {
    const boundedScore = Math.max(0, Math.min(100, score));
    return HISTORY_CHART_HEIGHT - (boundedScore / 100) * HISTORY_CHART_HEIGHT;
  }

  private formatHistoryDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  private formatHistoryMonth(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
  }

  private buildPriorityHistoryTooltipState(
    event: MouseEvent,
    label: string,
    chartWrap: HTMLElement,
  ): HistoryTooltipState {
    const wrapRect = chartWrap.getBoundingClientRect();
    const horizontalPadding = 10;
    const verticalOffset = 10;
    const maxTooltipWidth = 220;
    const tooltipLeft = Math.max(
      horizontalPadding,
      Math.min(
        wrapRect.width - maxTooltipWidth,
        event.clientX - wrapRect.left - maxTooltipWidth / 2,
      ),
    );
    const tooltipTop = Math.max(
      2,
      Math.min(wrapRect.height - 28, event.clientY - wrapRect.top - verticalOffset - 28),
    );

    return {
      label,
      left: tooltipLeft,
      top: tooltipTop,
    };
  }

  private applyToolbarSort(field: SortField, selection: ToolbarSortSelection): void {
    if (selection === 'default' || selection === 'attention-first') {
      this.activeSortField.set('priority');
      this.activeSortDirection.set('desc');
      return;
    }

    this.activeSortField.set(field);
    this.activeSortDirection.set(selection);
  }

  private parseDate(value: string): Date {
    const [monthText = '1', dayText = '1', yearText = '2000'] = value.split('-');
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);

    return new Date(year, month, day);
  }

  private parseAppointmentDateTime(inspection: InspectionRecord): Date {
    if (!inspection.appointmentDate) {
      return new Date(Number.NaN);
    }

    const baseDate = this.parseDate(inspection.appointmentDate);
    const timeMatch = inspection.appointmentTime.match(/^(\d{1,2}):(\d{2})(am|pm)/i);

    if (!timeMatch) {
      return baseDate;
    }

    const [, rawHours, rawMinutes, meridiem] = timeMatch;
    let hours = Number(rawHours) % 12;

    if (meridiem.toLowerCase() === 'pm') {
      hours += 12;
    }

    return new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      hours,
      Number(rawMinutes),
    );
  }

  private buildPlanRows(inspections: InspectionRecord[]): InspectionPlanRow[] {
    const groupedInspections = new Map<string, InspectionRecord[]>();

    for (const inspection of inspections) {
      const subjectInspections = groupedInspections.get(inspection.subjectId) ?? [];
      subjectInspections.push(inspection);
      groupedInspections.set(inspection.subjectId, subjectInspections);
    }

    return Array.from(groupedInspections.values()).map((subjectInspections) => {
      const activeInspection = this.selectActiveInspection(subjectInspections);
      const displayInspection =
        activeInspection ??
        this.selectLatestCompletedInspection(subjectInspections) ??
        this.selectLatestInspection(subjectInspections);
      const isScheduledInspection = displayInspection.inspectionStatus === 'Scheduled';
      const appointmentDateTime = isScheduledInspection
        ? this.parseAppointmentDateTime(displayInspection)
        : null;
      const appointmentText = isScheduledInspection
        ? this.formatAppointmentText(displayInspection)
        : '—';
      const inspectionWorkflowStatus = this.getInspectionWorkflowStatus(displayInspection);
      const inspectionStatusReason = this.getInspectionStatusReason(displayInspection);

      return {
        inspectionId: displayInspection.inspectionId,
        subjectId: displayInspection.subjectId,
        subjectName: displayInspection.subjectName,
        nextDue: displayInspection.nextDue,
        priority: displayInspection.priority,
        inspectionStatus: displayInspection.inspectionStatus,
        inspectionWorkflowStatus,
        inspectionStatusReason,
        inspectionStatusDisplay: `${inspectionWorkflowStatus} - ${inspectionStatusReason}`,
        inspectionReason: displayInspection.inspectionReason,
        inspectionType: displayInspection.inspectionType,
        appointmentDate: displayInspection.appointmentDate,
        appointmentText,
        appointmentTooltip: isScheduledInspection
          ? this.buildAppointmentTooltip(displayInspection, appointmentText)
          : null,
        appointmentTimestamp:
          appointmentDateTime && !Number.isNaN(appointmentDateTime.getTime())
            ? appointmentDateTime.getTime()
            : null,
        canCreateInspection: !activeInspection && this.canCreateInspection(),
      };
    });
  }

  private selectActiveInspection(inspections: InspectionRecord[]): InspectionRecord | null {
    const activeInspections = inspections
      .filter((inspection) => this.isOpenInspection(inspection.inspectionStatus))
      .sort((leftInspection, rightInspection) => {
        const leftStatusWeight = leftInspection.inspectionStatus === 'Scheduled' ? 0 : 1;
        const rightStatusWeight = rightInspection.inspectionStatus === 'Scheduled' ? 0 : 1;

        if (leftStatusWeight !== rightStatusWeight) {
          return leftStatusWeight - rightStatusWeight;
        }

        return this.sortInspectionAppointments(leftInspection, rightInspection);
      });

    return activeInspections[0] ?? null;
  }

  private selectLatestCompletedInspection(
    inspections: InspectionRecord[],
  ): InspectionRecord | null {
    const completedInspections = inspections
      .filter(
        (inspection) =>
          !this.isOpenInspection(inspection.inspectionStatus) &&
          inspection.inspectionStatus !== 'Canceled',
      )
      .sort((leftInspection, rightInspection) =>
        this.sortInspectionAppointments(rightInspection, leftInspection),
      );

    return completedInspections[0] ?? null;
  }

  private selectLatestInspection(inspections: InspectionRecord[]): InspectionRecord {
    return [...inspections].sort((leftInspection, rightInspection) =>
      this.sortInspectionAppointments(rightInspection, leftInspection),
    )[0];
  }

  private isOpenInspection(status: InspectionStatus): boolean {
    return status === 'Pending' || status === 'Planned' || status === 'Scheduled';
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

    const hasAssignedInspector =
      inspection.assignedInspector.trim().length > 0 &&
      inspection.assignedInspector !== 'Unassigned';
    const hasScheduledAppointment = inspection.appointmentDate.trim().length > 0;

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

    const hasAssignedInspector =
      inspection.assignedInspector.trim().length > 0 &&
      inspection.assignedInspector !== 'Unassigned';
    const hasScheduledAppointment = inspection.appointmentDate.trim().length > 0;

    if (workflowStatus === 'New') {
      return 'Created';
    }

    if (!hasAssignedInspector) {
      return 'Not Assigned';
    }

    if (!hasScheduledAppointment) {
      return 'Not Scheduled';
    }

    const appointmentDateTime = this.parseAppointmentDateTime(inspection);
    return !Number.isNaN(appointmentDateTime.getTime()) &&
      appointmentDateTime.getTime() < Date.now()
      ? 'Appointment Complete'
      : 'Scheduled';
  }

  private sortInspectionAppointments(
    leftInspection: InspectionRecord,
    rightInspection: InspectionRecord,
  ): number {
    const leftAppointment = this.parseAppointmentDateTime(leftInspection);
    const rightAppointment = this.parseAppointmentDateTime(rightInspection);
    const leftValue = Number.isNaN(leftAppointment.getTime())
      ? Number.NEGATIVE_INFINITY
      : leftAppointment.getTime();
    const rightValue = Number.isNaN(rightAppointment.getTime())
      ? Number.NEGATIVE_INFINITY
      : rightAppointment.getTime();

    return leftValue - rightValue;
  }

  private buildAppointmentTooltip(inspection: InspectionRecord, appointmentText: string): string {
    const tooltipParts = [`Date/Time: ${appointmentText}`];

    if (inspection.appointmentLocation) {
      tooltipParts.push(`Location: ${inspection.appointmentLocation}`);
    }

    return tooltipParts.join(' | ');
  }

  private formatAppointmentText(inspection: InspectionRecord): string {
    const appointmentDateTime = this.parseAppointmentDateTime(inspection);

    if (!Number.isNaN(appointmentDateTime.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(appointmentDateTime);
    }

    return inspection.appointmentLocation || 'TBD';
  }

  private buildDraftAppointment(showEmptyMessage = true): NewInspectionAppointmentDraft | null {
    const dateTime = this.appointmentDateTimeInput().trim();
    const location = this.appointmentLocationInput().trim();

    if (dateTime.length === 0 && location.length === 0) {
      if (showEmptyMessage) {
        this.newInspectionValidationMessage.set(
          'Enter an appointment date or location before adding an appointment.',
        );
      }
      return null;
    }

    if (dateTime.length > 0) {
      const parsedDateTime = Date.parse(dateTime);
      if (Number.isNaN(parsedDateTime) || parsedDateTime < Date.now()) {
        this.newInspectionValidationMessage.set('Inspection Date must be a future date and time.');
        return null;
      }
    }

    this.newInspectionValidationMessage.set('');
    return {
      dateTime,
      location,
    };
  }

  private resolveInspectorSelection(auditorName: string): string[] {
    const matchingInspector = USERS.find(
      (user) =>
        user.active &&
        user.lastName.localeCompare(auditorName, undefined, { sensitivity: 'base' }) === 0,
    );

    return matchingInspector
      ? [`${matchingInspector.firstName} ${matchingInspector.lastName}`]
      : [];
  }

  private buildSelectedAppointmentDateTime(time: string): Date {
    const currentValue = this.appointmentDateTimeValue;
    const baseDate = currentValue ?? new Date();
    const nextDateTime = new Date(baseDate);
    const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!timeMatch) {
      return currentValue ?? new Date(Date.now() + 60 * 60 * 1000);
    }

    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const meridiem = timeMatch[3].toUpperCase();

    if (meridiem === 'PM' && hour !== 12) {
      hour += 12;
    }

    if (meridiem === 'AM' && hour === 12) {
      hour = 0;
    }

    nextDateTime.setSeconds(0, 0);
    nextDateTime.setHours(hour, minute, 0, 0);

    if (!currentValue && nextDateTime.getTime() <= Date.now()) {
      nextDateTime.setDate(nextDateTime.getDate() + 1);
    }

    return nextDateTime;
  }

  private formatDateTimeInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    const hours = `${value.getHours()}`.padStart(2, '0');
    const minutes = `${value.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private dayDifferenceFromToday(date: Date): number {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.floor((date.getTime() - startOfToday.getTime()) / millisecondsPerDay);
  }
}
