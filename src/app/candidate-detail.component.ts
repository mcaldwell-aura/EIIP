import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavMenuService } from './nav-menu.service';
import { CandidateStoreService } from './candidate-store.service';
import { type CandidateRecord, type CandidateType, type NameSuffix } from './candidates.data';
import { InspectionStoreService } from './inspection-store.service';
import { type InspectionRecord, type InspectionStatus } from './inspection-data';
import { CandidateActivityTimelineComponent } from './candidate-activity-timeline.component';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';

type CandidateDetailData = {
  candidateId: string;
  candidateName: string;
  candidateType: CandidateType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: NameSuffix | null;
  organizationName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  nextDueDate: string | null;
  externalIdentifier: string | null;
  startDate: string;
  endDate: string | null;
  passRate: string | null;
  testVolume: string | null;
};

type CandidateDetailTab = 'summary' | 'inspection-history' | 'timeline';
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

const NAME_SUFFIXES: NameSuffix[] = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

@Component({
  selector: 'app-candidate-detail',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    SelectModule,
    TagModule,
    CandidateActivityTimelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candidate-detail.component.html',
  styleUrl: './candidate-detail.component.scss',
})
export class CandidateDetailComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly browserLocation = inject(Location);
  private readonly candidateStore = inject(CandidateStoreService);
  private readonly inspectionStore = inject(InspectionStoreService);

  private readonly candidateData = signal<CandidateDetailData | null>(null);
  protected readonly candidateId = signal<string>('');

  protected readonly candidateName = signal('');
  protected readonly candidateType = signal<CandidateType>('Individual');
  protected readonly firstName = signal('');
  protected readonly middleName = signal('');
  protected readonly lastName = signal('');
  protected readonly suffix = signal<NameSuffix | ''>('');
  protected readonly organizationName = signal('');
  protected readonly contactEmail = signal('');
  protected readonly contactPhone = signal('');
  protected readonly nextDueDate = signal('');
  protected readonly externalIdentifier = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');
  protected readonly passRate = signal('');
  protected readonly testVolume = signal('');

  protected readonly saveToastVisible = signal(false);
  protected readonly validationErrorMessage = signal('');
  protected readonly showValidationError = computed(() => this.validationErrorMessage().length > 0);
  protected readonly activeTab = signal<CandidateDetailTab>('summary');
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

  protected readonly nameSuffixes = NAME_SUFFIXES;
  protected readonly suffixOptions = NAME_SUFFIXES.map((suffix) => ({
    label: suffix,
    value: suffix,
  }));

  // Mock permission - in a real app, this would come from a permission service
  protected readonly hasManageCandidatesPermission = true;

  protected readonly isIndividual = computed(() => this.candidateType() === 'Individual');
  protected readonly isOrganization = computed(() => this.candidateType() === 'Organization');

  protected readonly hasOpenInspection = computed(() => {
    const candidateIdValue = this.candidateId();
    return this.inspectionStore
      .inspections()
      .filter((inspection) => inspection.subjectId === candidateIdValue)
      .some((inspection) => {
        const workflowStatus = this.getInspectionWorkflowStatus(inspection);
        return workflowStatus === 'New' || workflowStatus === 'Pending';
      });
  });

  protected readonly isDeactivated = computed(() => {
    return this.endDate().trim() !== '';
  });

  protected readonly candidateStatusLabel = computed(() => {
    if (this.isDeactivated()) {
      return 'Deactivated';
    }
    return this.hasOpenInspection() ? 'Inspection Open' : 'No Current Inspections';
  });

  protected readonly candidateStatusSeverity = computed(() => {
    if (this.isDeactivated()) {
      return 'danger';
    }
    return this.hasOpenInspection() ? 'info' : 'secondary';
  });

  protected getCandidateStatusClass(): string {
    if (this.isDeactivated()) {
      return 'deactivated-status';
    }
    return this.hasOpenInspection() ? 'inspection-open-status' : '';
  }

  protected readonly inspectionStatusLabel = computed(() => {
    return this.hasOpenInspection() ? 'Inspection Open' : 'No Current Inspections';
  });

  protected readonly inspectionStatusSeverity = computed(() => {
    return this.hasOpenInspection() ? 'info' : 'secondary';
  });

  protected readonly candidateMaturity = computed(() => {
    const startDateStr = this.startDate();
    if (!startDateStr) return 'Unknown';

    const startDate = new Date(startDateStr);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffYears = diffDays / 365.25;

    return diffYears >= 1 ? 'Established' : 'New';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    const state = this.router.getCurrentNavigation()?.extras.state;
    if (state?.['candidateSaved'] === true) {
      this.saveToastVisible.set(true);
      setTimeout(() => {
        this.saveToastVisible.set(false);
      }, 3000);
    }

    this.route.params.subscribe((params) => {
      this.candidateId.set(params['candidateId']);
      this.loadCandidate(params['candidateId']);
    });
  }

  private loadCandidate(id: string): void {
    const candidate = this.candidateStore.findCandidateById(id);
    const mappedCandidate = candidate
      ? this.mapCandidateRecord(candidate)
      : this.mapFallbackSubjectToCandidate(id);

    if (!mappedCandidate) {
      this.router.navigate(['/candidates']);
      return;
    }

    this.candidateData.set(mappedCandidate);
    this.candidateName.set(mappedCandidate.candidateName);
    this.candidateType.set(mappedCandidate.candidateType);
    this.firstName.set(mappedCandidate.firstName ?? '');
    this.middleName.set(mappedCandidate.middleName ?? '');
    this.lastName.set(mappedCandidate.lastName ?? '');
    this.suffix.set(mappedCandidate.suffix ?? '');
    this.organizationName.set(mappedCandidate.organizationName ?? '');
    this.contactEmail.set(mappedCandidate.contactEmail ?? '');
    this.contactPhone.set(mappedCandidate.contactPhone ?? '');
    this.nextDueDate.set(mappedCandidate.nextDueDate ?? '');
    this.externalIdentifier.set(mappedCandidate.externalIdentifier ?? '');
    this.startDate.set(mappedCandidate.startDate);
    this.endDate.set(mappedCandidate.endDate ?? '');
    this.passRate.set(mappedCandidate.passRate ?? '');
    this.testVolume.set(mappedCandidate.testVolume ?? '');
    this.loadInspectionHistory(mappedCandidate.candidateId);
  }

  private loadInspectionHistory(candidateId: string): void {
    const historyRows = this.inspectionStore
      .inspections()
      .filter((inspection) => inspection.subjectId === candidateId)
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

  private mapFallbackSubjectToCandidate(subjectId: string): CandidateDetailData | null {
    const inspection = this.inspectionStore
      .inspections()
      .find((row) => row.subjectId === subjectId);

    if (!inspection) {
      return null;
    }

    const nameParts = inspection.subjectName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const middleName =
      nameParts.length > 2 ? nameParts.slice(1, nameParts.length - 1).join(' ') : null;

    return {
      candidateId: subjectId,
      candidateName: inspection.subjectName,
      candidateType: 'Individual',
      firstName,
      middleName,
      lastName,
      suffix: null,
      organizationName: null,
      contactEmail: null,
      contactPhone: null,
      nextDueDate: null,
      externalIdentifier: null,
      startDate: this.todayIsoDate(),
      endDate: null,
      passRate: null,
      testVolume: null,
    };
  }

  private mapCandidateRecord(candidate: CandidateRecord): CandidateDetailData {
    const nameParts = candidate.firstMiddleLast?.split(' ') ?? [];
    const [mappedFirstName = null, mappedMiddleName = null, mappedLastName = null] = nameParts;
    const firstName = candidate.firstName ?? mappedFirstName;
    const middleName = candidate.middleName ?? mappedMiddleName;
    const lastName = candidate.lastName ?? mappedLastName;

    return {
      candidateId: candidate.candidateId,
      candidateName:
        candidate.candidateType === 'Individual'
          ? (candidate.firstMiddleLast ?? '')
          : (candidate.organizationName ?? ''),
      candidateType: candidate.candidateType,
      firstName,
      middleName,
      lastName,
      suffix: candidate.suffix ?? null,
      organizationName: candidate.organizationName,
      contactEmail: candidate.contactEmail ?? null,
      contactPhone: candidate.contactPhone ?? null,
      nextDueDate: candidate.nextDueDate,
      externalIdentifier:
        candidate.externalIdentifier ?? `EXT-${candidate.candidateId.toUpperCase()}`,
      startDate: candidate.startDate,
      endDate: candidate.endDate,
      passRate: candidate.passRate ?? null,
      testVolume: candidate.testVolume ?? null,
    };
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

  protected showTimelineTab(): void {
    this.activeTab.set('timeline');
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

  protected validateForm(): boolean {
    this.validationErrorMessage.set('');

    // Validate required fields for Individual
    if (this.isIndividual()) {
      if (!this.firstName().trim()) {
        this.validationErrorMessage.set('First Name is required.');
        return false;
      }
      if (this.firstName().length > 50) {
        this.validationErrorMessage.set('First Name must not exceed 50 characters.');
        return false;
      }
      if (this.middleName().length > 50) {
        this.validationErrorMessage.set('Middle Name must not exceed 50 characters.');
        return false;
      }
      if (!this.lastName().trim()) {
        this.validationErrorMessage.set('Last Name is required.');
        return false;
      }
      if (this.lastName().length > 70) {
        this.validationErrorMessage.set('Last Name must not exceed 70 characters.');
        return false;
      }
      if (!this.suffix().trim()) {
        this.validationErrorMessage.set('Suffix is required.');
        return false;
      }
    }

    // Validate required fields for Organization
    if (this.isOrganization()) {
      if (!this.organizationName().trim()) {
        this.validationErrorMessage.set('Organization Name is required.');
        return false;
      }
      if (this.organizationName().length > 256) {
        this.validationErrorMessage.set('Organization Name must not exceed 256 characters.');
        return false;
      }
    }

    // Validate optional fields
    if (this.externalIdentifier().length > 256) {
      this.validationErrorMessage.set('External Identifier must not exceed 256 characters.');
      return false;
    }

    if (this.nextDueDate().trim()) {
      const nextDueDate = new Date(this.nextDueDate());
      if (Number.isNaN(nextDueDate.getTime())) {
        this.validationErrorMessage.set('Next Due Date must be a valid date.');
        return false;
      }
    }

    // Validate Start Date
    if (!this.startDate().trim()) {
      this.validationErrorMessage.set('Start Date is required.');
      return false;
    }

    const startDateObj = new Date(this.startDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj > today) {
      this.validationErrorMessage.set('Start Date cannot be in the future.');
      return false;
    }

    // Validate End Date if provided
    if (this.endDate().trim()) {
      const endDateObj = new Date(this.endDate());
      if (endDateObj > today) {
        this.validationErrorMessage.set('End Date cannot be in the future.');
        return false;
      }
      if (endDateObj < startDateObj) {
        this.validationErrorMessage.set('End Date cannot be before Start Date.');
        return false;
      }
    }

    return true;
  }

  protected saveCandidate(): void {
    if (!this.validateForm()) {
      return;
    }

    const updatedCandidate = this.candidateStore.updateCandidate(this.candidateId(), {
      candidateType: this.candidateType(),
      firstName: this.isIndividual() ? this.firstName() : null,
      middleName: this.isIndividual() ? this.middleName() : null,
      lastName: this.isIndividual() ? this.lastName() : null,
      suffix: this.isIndividual() ? this.suffix() || null : null,
      organizationName: this.isOrganization() ? this.organizationName() : null,
      contactEmail: this.contactEmail().trim() || null,
      contactPhone: this.contactPhone().trim() || null,
      nextDueDate: this.nextDueDate().trim() || null,
      externalIdentifier: this.externalIdentifier().trim() || null,
      startDate: this.startDate(),
      endDate: this.endDate().trim() || null,
      passRate: this.passRate().trim() || null,
      testVolume: this.testVolume().trim() || null,
    });

    if (!updatedCandidate) {
      this.validationErrorMessage.set('Unable to save candidate.');
      return;
    }

    this.loadCandidate(updatedCandidate.candidateId);
    this.saveToastVisible.set(true);
    setTimeout(() => {
      this.saveToastVisible.set(false);
    }, 3000);
  }

  protected onFirstNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.firstName.set(input.value);
  }

  protected onMiddleNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.middleName.set(input.value);
  }

  protected onLastNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.lastName.set(input.value);
  }

  protected onSuffixChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.suffix.set(select.value as NameSuffix | '');
  }

  protected onSuffixSelect(value: NameSuffix | null): void {
    this.suffix.set(value ?? '');
  }

  protected onOrganizationNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.organizationName.set(input.value);
  }

  protected onNextDueDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.nextDueDate.set(input.value);
  }

  protected onExternalIdentifierChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.externalIdentifier.set(input.value);
  }

  protected onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);
  }

  protected onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
  }

  protected onContactEmailChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contactEmail.set(input.value);
  }

  protected onContactPhoneChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.contactPhone.set(input.value);
  }

  protected onPassRateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.passRate.set(input.value);
  }

  protected onTestVolumeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.testVolume.set(input.value);
  }

  protected formatHeaderDate(value: string): string {
    if (!value || !value.trim()) {
      return '--';
    }
    const timestamp = this.parseDateToTimestamp(value);
    if (timestamp === 0) {
      return value;
    }
    const parsedDate = new Date(timestamp);
    const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsedDate.getDate()}`.padStart(2, '0');
    const year = `${parsedDate.getFullYear()}`;
    return `${month}/${day}/${year}`;
  }

  private todayIsoDate(): string {
    const today = new Date();
    const year = `${today.getFullYear()}`;
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
