import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LOCATIONS } from './locations.data';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import { type InspectionRecord, type InspectionStatus } from './inspection-data';
import { InspectionStoreService } from './inspection-store.service';
import { USERS } from './users.data';

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

type PriorityContext = {
  why: string;
  lastInspectionScore: string;
  planningCycle: string;
  lastInspected: string;
  entityType: string;
};

type InspectionPlanRow = {
  inspectionId: string;
  subjectId: string;
  subjectName: string;
  nextDue: string;
  priority: number;
  inspectionStatus: InspectionStatus;
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

const PRIORITY_CONTEXT: Record<string, PriorityContext> = {
  '892749': {
    why: 'This examiner has been prioritized because the pass rate for administered road tests has significantly exceeded the regional average over the past six months, and the required annual inspection cycle is overdue.',
    lastInspectionScore: 'Pass',
    planningCycle: 'Annual 2024-2025',
    lastInspected: '10-15-2026',
    entityType: 'Subject',
  },
};

@Component({
  selector: 'app-inspection-overview',
  imports: [RouterLink, NavMenuComponent],
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
  protected readonly selectedPriorityRow = signal<InspectionPlanRow | null>(null);
  protected readonly isNewInspectionModalOpen = signal(false);
  protected readonly newInspectionCandidate = signal<InspectionPlanRow | null>(null);
  protected readonly inspectionReasonInput = signal<InspectionReasonOption | ''>('');
  protected readonly inspectionTypeInput = signal<InspectionTypeOption | ''>('');
  protected readonly inspectorSearchTerm = signal('');
  protected readonly selectedInspectors = signal<string[]>([]);
  protected readonly appointmentDateTimeInput = signal('');
  protected readonly appointmentLocationInput = signal('');
  protected readonly stagedAppointments = signal<NewInspectionAppointmentDraft[]>([]);
  protected readonly newInspectionValidationMessage = signal('');
  protected readonly inspectionReasonOptions: readonly InspectionReasonOption[] = [
    'Change',
    'Original',
    'ReExam',
    'Reinstatement',
    'Periodic',
  ];
  protected readonly inspectionTypeOptions: readonly InspectionTypeOption[] = ['Overt', 'Covert'];
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
  protected readonly selectedPriorityContext = computed(() => {
    const row = this.selectedPriorityRow();
    if (!row) {
      return null;
    }

    const fallback: PriorityContext = {
      why: `This subject is prioritized because ${row.inspectionReason.toLowerCase()} activity and a score of ${row.priority} indicate elevated review attention ahead of the next due date of ${row.nextDue}.`,
      lastInspectionScore: row.inspectionStatus === 'Unsatisfactory' ? 'Fail' : 'Pass',
      planningCycle: 'Annual 2024-2025',
      lastInspected: row.appointmentDate || 'N/A',
      entityType: 'Subject',
    };

    return {
      ...fallback,
      ...(PRIORITY_CONTEXT[row.inspectionId] ?? {}),
      score: `${row.priority}/100`,
      level: this.priorityLevel(row.priority),
    };
  });
  protected readonly canSaveNewInspection = computed(
    () =>
      this.newInspectionCandidate() !== null &&
      this.inspectionReasonInput().length > 0 &&
      this.inspectionTypeInput().length > 0,
  );

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

  protected openPriorityModal(row: InspectionPlanRow): void {
    this.selectedPriorityRow.set(row);
  }

  protected closePriorityModal(): void {
    this.selectedPriorityRow.set(null);
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
    this.newInspectionValidationMessage.set('');
    this.isNewInspectionModalOpen.set(true);
  }

  protected closeNewInspectionModal(): void {
    this.isNewInspectionModalOpen.set(false);
    this.newInspectionCandidate.set(null);
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

  protected priorityLevel(priority: number): 'High' | 'Medium' | 'Low' {
    if (priority >= 85) {
      return 'High';
    }

    if (priority >= 50) {
      return 'Medium';
    }

    return 'Low';
  }

  protected handleEscape(): void {
    if (this.isNewInspectionModalOpen()) {
      this.closeNewInspectionModal();
      return;
    }

    if (this.selectedPriorityRow()) {
      this.closePriorityModal();
    }
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

      return {
        inspectionId: displayInspection.inspectionId,
        subjectId: displayInspection.subjectId,
        subjectName: displayInspection.subjectName,
        nextDue: displayInspection.nextDue,
        priority: displayInspection.priority,
        inspectionStatus: displayInspection.inspectionStatus,
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

  private dayDifferenceFromToday(date: Date): number {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.floor((date.getTime() - startOfToday.getTime()) / millisecondsPerDay);
  }
}
