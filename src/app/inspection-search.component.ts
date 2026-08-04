import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import {
  type InspectionRecord,
  type InspectionStatus,
  type InspectionType,
} from './inspection-data';
import { InspectionStoreService } from './inspection-store.service';
import { NavMenuService } from './nav-menu.service';

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

type InspectionWorkflowStatus = 'New' | 'Pending' | 'Closed';
type InspectionStatusSelection = InspectionWorkflowStatus | '';
type InspectionStatusReason =
  | 'Created'
  | 'Not Assigned'
  | 'Not Scheduled'
  | 'Scheduled'
  | 'Appointment Complete'
  | 'Completed'
  | 'Canceled';

type SearchParams = {
  inspectionNumber: string;
  subjectName: string;
  status: InspectionStatusSelection;
  inspectionStatusReason: InspectionStatusReason | '';
  inspectionType: InspectionType | 'all';
  inspector: string;
  inspectionReason: string;
  inspectionResult: InspectionStatus | 'all';
  completionDateFrom: string;
  completionDateTo: string;
};

type InspectionSearchRow = {
  inspectionNumber: string;
  inspectionNumberNumeric: number;
  subjectName: string;
  inspectionStatus: InspectionStatus;
  workflowStatus: InspectionWorkflowStatus;
  statusReason: InspectionStatusReason;
  workflowStatusDisplay: string;
  inspectionType: InspectionType;
  inspectionReason: string;
  nextDue: string;
  nextDueTimestamp: number;
  assignedInspector: string;
  appointmentDate: string;
  appointmentDateTimestamp: number;
};

type TableSortEvent = {
  field?: string;
  order?: number;
  data?: InspectionSearchRow[];
};

const DEFAULT_SEARCH_PARAMS: SearchParams = {
  inspectionNumber: '',
  subjectName: '',
  status: '',
  inspectionStatusReason: '',
  inspectionType: 'all',
  inspector: '',
  inspectionReason: '',
  inspectionResult: 'all',
  completionDateFrom: '',
  completionDateTo: '',
};

const PAGE_SIZE = 30;
const MOBILE_PAGE_SIZE = 10;

@Component({
  selector: 'app-inspection-search',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspection-search.component.html',
  styleUrl: './inspection-search.component.scss',
})
export class InspectionSearchComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly inspectionStore = inject(InspectionStoreService);

  private readonly rows = this.inspectionStore.inspections;

  protected readonly statusOptions: SelectOption<InspectionStatusSelection>[] = [
    { label: 'Select status', value: '' },
    { label: 'Status: New', value: 'New' },
    { label: 'Status: Pending', value: 'Pending' },
    { label: 'Status: Closed', value: 'Closed' },
  ];

  protected readonly inspectionTypeOptions: SelectOption<InspectionType | 'all'>[] = [
    { label: 'Type: All', value: 'all' },
    { label: 'Type: Overt', value: 'Overt' },
    { label: 'Type: Covert', value: 'Covert' },
  ];

  protected readonly inspectionStatusReasonOptions = computed<
    SelectOption<InspectionStatusReason | ''>[]
  >(() => {
    const selectedStatus = this.searchParams().status;
    if (!selectedStatus) {
      return [{ label: 'Status Reason: All', value: '' }];
    }

    const reasons = this.getStatusReasonOptions(selectedStatus);
    return [{ label: 'Status Reason: All', value: '' }, ...reasons];
  });

  protected readonly isStatusReasonDisabled = computed(() => !this.searchParams().status);

  protected readonly inspectionReasonOptions: SelectOption<string>[] = [
    { label: 'Reason: All', value: '' },
    { label: 'Reason: ReExam Inspection', value: 'ReExam Inspection' },
    { label: 'Reason: Complaint Review', value: 'Complaint Review' },
    { label: 'Reason: Targeted Follow-up', value: 'Targeted Follow-up' },
    { label: 'Reason: Routine Review', value: 'Routine Review' },
    { label: 'Reason: Change', value: 'Change' },
    { label: 'Reason: Original', value: 'Original' },
    { label: 'Reason: Reinstatement', value: 'Reinstatement' },
    { label: 'Reason: Periodic', value: 'Periodic' },
  ];

  protected readonly inspectionResultOptions: SelectOption<InspectionStatus | 'all'>[] = [
    { label: 'Result: All', value: 'all' },
    { label: 'Result: Good', value: 'Good' },
    { label: 'Result: Satisfactory', value: 'Satisfactory' },
    { label: 'Result: Unsatisfactory', value: 'Unsatisfactory' },
  ];

  protected readonly searchParams = signal<SearchParams>({ ...DEFAULT_SEARCH_PARAMS });
  protected readonly hasSearched = signal(false);
  protected readonly searchResults = signal<InspectionSearchRow[]>([]);
  protected readonly mobileCurrentPage = signal(1);

  protected readonly pageSize = PAGE_SIZE;
  protected readonly mobileTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.searchResults().length / MOBILE_PAGE_SIZE)),
  );
  protected readonly mobilePageOptions = computed(() =>
    Array.from({ length: this.mobileTotalPages() }, (_, index) => index + 1),
  );
  protected readonly mobilePagedResults = computed(() => {
    const safePage = Math.min(this.mobileCurrentPage(), this.mobileTotalPages());
    const startIndex = (safePage - 1) * MOBILE_PAGE_SIZE;
    return this.searchResults().slice(startIndex, startIndex + MOBILE_PAGE_SIZE);
  });
  protected readonly canGoToPreviousMobilePage = computed(() => this.mobileCurrentPage() > 1);
  protected readonly canGoToNextMobilePage = computed(
    () => this.mobileCurrentPage() < this.mobileTotalPages(),
  );

  protected readonly resultCountSummary = computed(() => {
    const count = this.searchResults().length;

    if (!this.hasSearched()) {
      return '';
    }

    if (count === 0) {
      return '0 results';
    }

    return `${count} result${count === 1 ? '' : 's'}`;
  });

  protected updateInspectionNumber(event: Event): void {
    this.patchSearchParams({ inspectionNumber: (event.target as HTMLInputElement).value });
  }

  protected updateSubjectName(event: Event): void {
    this.patchSearchParams({ subjectName: (event.target as HTMLInputElement).value });
  }

  protected updateInspector(event: Event): void {
    this.patchSearchParams({ inspector: (event.target as HTMLInputElement).value });
  }

  protected updateStatus(value: InspectionStatusSelection): void {
    const nextStatus = value;
    const nextReasonOptions = nextStatus
      ? this.getStatusReasonOptions(nextStatus).map((option) => option.value)
      : [];
    const currentReason = this.searchParams().inspectionStatusReason;
    const shouldResetReason =
      currentReason !== '' && (nextStatus === '' || !nextReasonOptions.includes(currentReason));

    this.patchSearchParams({
      status: nextStatus,
      inspectionStatusReason: shouldResetReason ? '' : currentReason,
    });
  }

  protected updateInspectionType(value: InspectionType | 'all'): void {
    this.patchSearchParams({ inspectionType: value });
  }

  protected updateInspectionStatusReason(value: InspectionStatusReason | ''): void {
    this.patchSearchParams({ inspectionStatusReason: value });
  }

  protected updateInspectionReason(value: string): void {
    this.patchSearchParams({ inspectionReason: value });
  }

  protected updateInspectionResult(value: InspectionStatus | 'all'): void {
    this.patchSearchParams({ inspectionResult: value });
  }

  protected updateCompletionDateFrom(event: Event): void {
    this.patchSearchParams({ completionDateFrom: (event.target as HTMLInputElement).value });
  }

  protected updateCompletionDateTo(event: Event): void {
    this.patchSearchParams({ completionDateTo: (event.target as HTMLInputElement).value });
  }

  protected search(): void {
    const searchParams = this.searchParams();
    const filtered = this.rows()
      .filter((row) => this.matchesSearch(row, searchParams))
      .map((row) => this.toSearchRow(row));

    filtered.sort(
      (leftRow, rightRow) =>
        rightRow.inspectionNumberNumeric - leftRow.inspectionNumberNumeric ||
        rightRow.nextDueTimestamp - leftRow.nextDueTimestamp,
    );

    const demoExpandedRows = this.ensureMockupPageCount(filtered);
    this.searchResults.set(demoExpandedRows.slice(0, 1000));
    this.hasSearched.set(true);
    this.mobileCurrentPage.set(1);
  }

  protected reset(): void {
    this.searchParams.set({ ...DEFAULT_SEARCH_PARAMS });
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.mobileCurrentPage.set(1);
  }

  protected customSort(event: TableSortEvent): void {
    const field = event.field as keyof InspectionSearchRow | undefined;
    const order = event.order ?? 1;

    if (!field || !event.data) {
      return;
    }

    event.data.sort((leftRow: InspectionSearchRow, rightRow: InspectionSearchRow) => {
      const leftValue = leftRow[field];
      const rightValue = rightRow[field];

      if (leftValue === rightValue) {
        return 0;
      }

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return (leftValue - rightValue) * order;
      }

      return (
        String(leftValue).localeCompare(String(rightValue), undefined, {
          sensitivity: 'base',
        }) * order
      );
    });

    this.searchResults.set([...event.data]);
    this.mobileCurrentPage.set(1);
  }

  protected goToPreviousMobilePage(): void {
    if (!this.canGoToPreviousMobilePage()) {
      return;
    }

    this.mobileCurrentPage.update((currentPage) => currentPage - 1);
  }

  protected goToNextMobilePage(): void {
    if (!this.canGoToNextMobilePage()) {
      return;
    }

    this.mobileCurrentPage.update((currentPage) => currentPage + 1);
  }

  protected updateMobileCurrentPage(event: Event): void {
    const selectedPage = Number((event.target as HTMLSelectElement).value);

    if (Number.isNaN(selectedPage)) {
      return;
    }

    const boundedPage = Math.min(Math.max(selectedPage, 1), this.mobileTotalPages());
    this.mobileCurrentPage.set(boundedPage);
  }

  private patchSearchParams(next: Partial<SearchParams>): void {
    this.searchParams.update((current) => ({
      ...current,
      ...next,
    }));
  }

  private toSearchRow(inspection: InspectionRecord): InspectionSearchRow {
    const inspectionNumberNumeric = Number.parseInt(inspection.inspectionId, 10);
    const nextDueDate = this.parseDate(inspection.nextDue);
    const appointmentDate = this.parseDate(inspection.appointmentDate);
    const workflowStatus = this.getInspectionWorkflowStatus(inspection);
    const statusReason = this.getInspectionStatusReason(inspection);

    return {
      inspectionNumber: inspection.inspectionId,
      inspectionNumberNumeric: Number.isNaN(inspectionNumberNumeric) ? 0 : inspectionNumberNumeric,
      subjectName: inspection.subjectName,
      inspectionStatus: inspection.inspectionStatus,
      workflowStatus,
      statusReason,
      workflowStatusDisplay: `${workflowStatus} - ${statusReason}`,
      inspectionType: inspection.inspectionType,
      inspectionReason: inspection.inspectionReason,
      nextDue: inspection.nextDue,
      nextDueTimestamp: nextDueDate.getTime(),
      assignedInspector: inspection.assignedInspector,
      appointmentDate: inspection.appointmentDate || 'N/A',
      appointmentDateTimestamp: Number.isNaN(appointmentDate.getTime())
        ? 0
        : appointmentDate.getTime(),
    };
  }

  private matchesSearch(inspection: InspectionRecord, searchParams: SearchParams): boolean {
    const inspectionNumber = searchParams.inspectionNumber.trim().toLowerCase();
    const subjectName = searchParams.subjectName.trim().toLowerCase();
    const inspector = searchParams.inspector.trim().toLowerCase();
    const inspectionReason = searchParams.inspectionReason.trim().toLowerCase();
    const inspectionStatusReason = searchParams.inspectionStatusReason.trim().toLowerCase();

    const matchesInspectionNumber =
      inspectionNumber.length === 0 ||
      inspection.inspectionId.toLowerCase().includes(inspectionNumber);
    const matchesSubjectName =
      subjectName.length === 0 || inspection.subjectName.toLowerCase().includes(subjectName);
    const workflowStatus = this.getInspectionWorkflowStatus(inspection);
    const statusReason = this.getInspectionStatusReason(inspection);

    const matchesStatus = searchParams.status === '' || workflowStatus === searchParams.status;
    const matchesType =
      searchParams.inspectionType === 'all' ||
      inspection.inspectionType === searchParams.inspectionType;
    const matchesInspector =
      inspector.length === 0 || inspection.assignedInspector.toLowerCase().includes(inspector);
    const matchesReason =
      inspectionReason.length === 0 ||
      inspection.inspectionReason.toLowerCase().includes(inspectionReason);
    const matchesStatusReason =
      inspectionStatusReason.length === 0 || statusReason.toLowerCase() === inspectionStatusReason;
    const matchesResult =
      searchParams.inspectionResult === 'all' ||
      inspection.inspectionStatus === searchParams.inspectionResult;

    const inspectionCompletionDate = this.parseDate(inspection.appointmentDate);
    const fromDate = searchParams.completionDateFrom
      ? new Date(`${searchParams.completionDateFrom}T00:00:00`)
      : null;
    const toDate = searchParams.completionDateTo
      ? new Date(`${searchParams.completionDateTo}T23:59:59`)
      : null;

    const matchesFrom = !fromDate || inspectionCompletionDate >= fromDate;
    const matchesTo = !toDate || inspectionCompletionDate <= toDate;

    return (
      matchesInspectionNumber &&
      matchesSubjectName &&
      matchesStatus &&
      matchesType &&
      matchesInspector &&
      matchesReason &&
      matchesStatusReason &&
      matchesResult &&
      matchesFrom &&
      matchesTo
    );
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

  private getStatusReasonOptions(
    status: InspectionWorkflowStatus,
  ): SelectOption<InspectionStatusReason>[] {
    const statusReasonOptionsByStatus: Record<InspectionWorkflowStatus, InspectionStatusReason[]> =
      {
        New: ['Created'],
        Pending: ['Not Assigned', 'Not Scheduled', 'Scheduled', 'Appointment Complete'],
        Closed: ['Completed', 'Canceled'],
      };

    return (statusReasonOptionsByStatus[status] ?? []).map((reason) => ({
      label: reason,
      value: reason,
    }));
  }

  private ensureMockupPageCount(rows: InspectionSearchRow[]): InspectionSearchRow[] {
    if (rows.length === 0 || rows.length > PAGE_SIZE) {
      return rows;
    }

    const targetCount = PAGE_SIZE * 2 + 8;
    const maxInspectionNumber = rows.reduce(
      (maxValue, row) => Math.max(maxValue, row.inspectionNumberNumeric),
      892000,
    );
    const expandedRows = [...rows];

    for (let index = rows.length; index < targetCount; index += 1) {
      const template = rows[index % rows.length];
      const nextInspectionNumber = maxInspectionNumber + index + 1;
      const cycleIndex = Math.floor(index / rows.length);

      expandedRows.push({
        ...template,
        inspectionNumber: `${nextInspectionNumber}`,
        inspectionNumberNumeric: nextInspectionNumber,
        subjectName: `${template.subjectName} ${cycleIndex + 1}`,
        nextDueTimestamp: template.nextDueTimestamp + cycleIndex * 86400000,
        appointmentDateTimestamp:
          template.appointmentDateTimestamp > 0
            ? template.appointmentDateTimestamp + cycleIndex * 86400000
            : template.appointmentDateTimestamp,
      });
    }

    return expandedRows;
  }

  private parseDate(value: string): Date {
    if (!value) {
      return new Date(Number.NaN);
    }

    const [monthText = '1', dayText = '1', yearText = '2000'] = value.split('-');
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);

    return new Date(year, month, day);
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

    const appointmentDate = this.parseDate(inspection.appointmentDate);
    return !Number.isNaN(appointmentDate.getTime()) && appointmentDate.getTime() < Date.now();
  }
}
