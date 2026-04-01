import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { INSPECTIONS, type InspectionRecord, type InspectionStatus } from './inspection-data';
import { InspectionStoreService } from './inspection-store.service';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';

type DetailsTab = 'summary' | 'appointments' | 'notes' | 'documents';

type NoteRow = {
  name: string;
  updatedDate: string;
  updatedBy: string;
  description: string;
};

type DocumentRow = {
  name: string;
  fileName: string;
  updatedDate: string;
};

type AppointmentRow = {
  dateTime: string;
  location: string;
  comments: string;
  status: AppointmentStatus;
};

type NoteModalMode = 'add' | 'edit';
type DocumentModalMode = 'add' | 'edit';
type AppointmentModalMode = 'create' | 'edit';
type InspectorStatus = 'Available' | 'Busy' | 'Offline';
type InspectorFilter = 'All' | InspectorStatus;

type InspectorOption = {
  name: string;
  status: InspectorStatus;
};

type SelectableInspectionStatus = InspectionStatus | 'Excellent' | 'Marginal' | 'Canceled';

type AppointmentStatus = 'Scheduled' | 'Completed' | 'Canceled';

type InspectionReasonOption = 'Change' | 'Original' | 'ReExam' | 'Reinstatement' | 'Periodic';
type InspectionTypeOption = 'Overt' | 'Covert';

type SummaryFormValue = {
  candidate: string;
  inspector: string;
  inspectionReason: InspectionReasonOption | '';
  inspectionType: InspectionTypeOption | '';
};

@Component({
  selector: 'app-inspection-details',
  imports: [RouterLink, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly inspectionStore = inject(InspectionStoreService);
  protected readonly menuService = inject(NavMenuService);
  private saveToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private appointmentToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly activeTab = signal<DetailsTab>('summary');
  protected readonly isAppointmentModalOpen = signal(false);
  protected readonly isAssignInspectorModalOpen = signal(false);
  protected readonly isNoteModalOpen = signal(false);
  protected readonly isDeleteNoteModalOpen = signal(false);
  protected readonly isDocumentModalOpen = signal(false);
  protected readonly isDeleteDocumentModalOpen = signal(false);
  protected readonly noteModalMode = signal<NoteModalMode>('add');
  protected readonly documentModalMode = signal<DocumentModalMode>('add');
  protected readonly appointmentModalMode = signal<AppointmentModalMode>('edit');
  protected readonly activeNoteIndex = signal<number | null>(null);
  protected readonly activeDocumentIndex = signal<number | null>(null);
  protected readonly activeAppointmentIndex = signal<number | null>(null);
  protected readonly inspectionId = computed(
    () =>
      this.paramMap().get('inspectionId') ??
      this.inspectionStore.inspections()[0]?.inspectionId ??
      INSPECTIONS[0].inspectionId,
  );
  private readonly createdInspectionToastEffect = effect(
    () => {
      const inspectionId = this.inspectionId();

      if (inspectionId && this.inspectionStore.consumeCreatedInspectionToast(inspectionId)) {
        this.triggerSaveToast();
      }
    },
    { allowSignalWrites: true },
  );
  private readonly assignedInspectorByInspection = signal<Record<string, string>>({});
  private readonly inspectionStatusByInspection = signal<
    Record<string, SelectableInspectionStatus>
  >({});
  private readonly appointmentRowsByInspection = signal<Record<string, AppointmentRow[]>>({});
  private readonly summaryFormByInspection = signal<Record<string, SummaryFormValue>>({});
  private readonly noteRowsByInspection = signal<Record<string, NoteRow[]>>({});
  private readonly documentRowsByInspection = signal<Record<string, DocumentRow[]>>({});
  protected readonly inspectorSearchTerm = signal('');
  protected readonly inspectorStatusFilter = signal<InspectorFilter>('All');
  private readonly inspectorOptions = signal<InspectorOption[]>([
    { name: 'John Doe', status: 'Available' },
    { name: 'Jamie Smith', status: 'Busy' },
    { name: 'Taylor Brooks', status: 'Available' },
    { name: 'Morgan Chen', status: 'Offline' },
    { name: 'Riley Carter', status: 'Available' },
    { name: 'Alex Johnson', status: 'Busy' },
  ]);
  protected readonly inspection = computed<InspectionRecord>(
    () =>
      this.inspectionStore
        .inspections()
        .find((item) => item.inspectionId === this.inspectionId()) ?? INSPECTIONS[0],
  );
  protected readonly inspectionStatusOptions: readonly SelectableInspectionStatus[] = [
    'Pending',
    'Planned',
    'Scheduled',
    'Excellent',
    'Good',
    'Satisfactory',
    'Marginal',
    'Unsatisfactory',
    'Canceled',
  ];
  protected readonly appointmentStatusOptions: readonly AppointmentStatus[] = [
    'Scheduled',
    'Completed',
    'Canceled',
  ];
  protected readonly currentInspectionStatus = computed<SelectableInspectionStatus>(
    () =>
      this.inspectionStatusByInspection()[this.inspection().inspectionId] ??
      this.inspection().inspectionStatus,
  );
  protected readonly inspectionReasonOptions: readonly InspectionReasonOption[] = [
    'Change',
    'Original',
    'ReExam',
    'Reinstatement',
    'Periodic',
  ];
  protected readonly inspectionTypeOptions: readonly InspectionTypeOption[] = ['Overt', 'Covert'];
  protected readonly activeInspectorOptions = computed(() =>
    this.inspectorOptions().filter((inspector) => inspector.status === 'Available'),
  );
  protected readonly summaryForm = computed<SummaryFormValue>(() => {
    const inspection = this.inspection();
    const saved = this.summaryFormByInspection()[inspection.inspectionId];
    if (saved) {
      return saved;
    }

    const reason = this.inspectionReasonOptions.includes(
      inspection.inspectionReason as InspectionReasonOption,
    )
      ? (inspection.inspectionReason as InspectionReasonOption)
      : '';
    const type = this.inspectionTypeOptions.includes(
      inspection.inspectionType as InspectionTypeOption,
    )
      ? (inspection.inspectionType as InspectionTypeOption)
      : '';

    return {
      candidate: inspection.subjectName,
      inspector: this.isAssigned(inspection.assignedInspector) ? inspection.assignedInspector : '',
      inspectionReason: reason,
      inspectionType: type,
    };
  });
  protected readonly canSaveSummary = computed(() => {
    const form = this.summaryForm();
    return form.inspectionReason.length > 0 && form.inspectionType.length > 0;
  });
  protected readonly showSaveToast = signal(false);
  protected readonly showAppointmentCreatedToast = signal(false);
  protected readonly assignedInspector = computed(
    () =>
      this.assignedInspectorByInspection()[this.inspection().inspectionId] ??
      this.inspection().assignedInspector,
  );
  protected readonly baseNoteRows = computed<NoteRow[]>(() => {
    const assignedInspector = this.isAssigned(this.assignedInspector())
      ? this.assignedInspector()
      : 'N/A';

    if (this.inspection().inspectionId === '892749') {
      return [
        {
          name: 'Vehicle Inspection',
          updatedDate: '05-14-2026',
          updatedBy: 'N/A',
          description: 'Vehicle inspection review note.',
        },
        {
          name: 'CDL Skills Test',
          updatedDate: '05-14-2026',
          updatedBy: 'N/A',
          description: 'CDL skills test note.',
        },
        {
          name: 'Road Test',
          updatedDate: '05-14-2026',
          updatedBy: 'John Doe',
          description: 'Road test note recorded by John Doe.',
        },
        {
          name: 'Vehicle Inspection',
          updatedDate: '05-14-2026',
          updatedBy: 'N/A',
          description: 'Vehicle inspection follow-up note.',
        },
      ];
    }

    return this.inspection().notes.map((note) => ({
      name: note,
      updatedDate: this.inspection().appointmentDate,
      updatedBy: assignedInspector,
      description: `${note} for ${this.inspection().inspectionReason}.`,
    }));
  });
  protected readonly noteRows = computed<NoteRow[]>(() => {
    return this.noteRowsByInspection()[this.inspection().inspectionId] ?? this.baseNoteRows();
  });
  protected readonly baseDocumentRows = computed<DocumentRow[]>(() => {
    if (this.inspection().inspectionId === '892749') {
      return [
        {
          name: 'Vehicle Inspection',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
        },
        {
          name: 'CDL Skills Test',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
        },
        {
          name: 'Road Test',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
        },
        {
          name: 'Vehicle Inspection',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
        },
      ];
    }

    return this.inspection().documents.map((document) => ({
      name: this.inspection().inspectionReason,
      fileName: document,
      updatedDate: this.inspection().appointmentDate,
    }));
  });
  protected readonly documentRows = computed<DocumentRow[]>(() => {
    return (
      this.documentRowsByInspection()[this.inspection().inspectionId] ?? this.baseDocumentRows()
    );
  });
  protected readonly appointmentDateTimeInput = signal('');
  protected readonly appointmentLocationInput = signal('');
  protected readonly appointmentCommentsInput = signal('');
  protected readonly appointmentStatusInput = signal<AppointmentStatus>('Scheduled');
  protected readonly appointmentValidationMessage = signal('');
  protected readonly noteNameInput = signal('');
  protected readonly noteDescriptionInput = signal('');
  protected readonly documentNameInput = signal('');
  protected readonly documentFileNameInput = signal('');
  protected readonly documentUploadName = signal('');
  protected readonly noteNameOptions = computed<string[]>(() => {
    const options = [this.inspection().subjectName];

    if (this.isAssigned(this.inspection().assignedInspector)) {
      options.push(this.inspection().assignedInspector);
    }

    return [...new Set(options)];
  });
  protected readonly canSaveNote = computed(
    () => this.noteNameInput().trim().length > 0 && this.noteDescriptionInput().trim().length > 0,
  );
  protected readonly noteModalTitle = computed(() =>
    this.noteModalMode() === 'edit' ? 'Edit Note' : 'Add Note',
  );
  protected readonly noteSubmitLabel = computed(() =>
    this.noteModalMode() === 'edit' ? 'Save Changes' : 'Save',
  );
  protected readonly pendingDeleteNote = computed(() => {
    const activeIndex = this.activeNoteIndex();

    if (activeIndex === null) {
      return null;
    }

    return this.noteRows()[activeIndex] ?? null;
  });
  protected readonly canSaveDocument = computed(
    () =>
      this.documentNameInput().trim().length > 0 &&
      this.documentFileNameInput().trim().length > 0 &&
      this.documentUploadName().trim().length > 0,
  );
  protected readonly documentModalTitle = computed(() =>
    this.documentModalMode() === 'edit' ? 'Edit Document' : 'Add Document',
  );
  protected readonly documentSubmitLabel = computed(() =>
    this.documentModalMode() === 'edit' ? 'Save Changes' : 'Save',
  );
  protected readonly pendingDeleteDocument = computed(() => {
    const activeIndex = this.activeDocumentIndex();

    if (activeIndex === null) {
      return null;
    }

    return this.documentRows()[activeIndex] ?? null;
  });
  protected readonly filteredInspectors = computed(() => {
    const searchTerm = this.inspectorSearchTerm().trim().toLowerCase();
    const statusFilter = this.inspectorStatusFilter();

    return this.inspectorOptions().filter((inspector) => {
      const matchesSearch =
        searchTerm.length === 0 || inspector.name.toLowerCase().includes(searchTerm);
      const matchesStatus = statusFilter === 'All' || inspector.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  });
  protected readonly baseAppointmentRows = computed<AppointmentRow[]>(() => {
    const inspection = this.inspection();

    if (
      !inspection.appointmentDate &&
      !inspection.appointmentTime &&
      !inspection.appointmentLocation
    ) {
      return [];
    }

    const currentStatus = this.getDefaultAppointmentStatus();

    return [
      {
        dateTime: `${inspection.appointmentDate} ${inspection.appointmentTime}`.trim(),
        location: inspection.appointmentLocation,
        comments: inspection.notes[0] ?? '',
        status: currentStatus,
      },
    ];
  });
  protected readonly appointmentRows = computed<AppointmentRow[]>(() => {
    const inspectionId = this.inspection().inspectionId;

    return (
      this.appointmentRowsByInspection()[inspectionId] ??
      this.inspectionStore.getAppointmentRows(inspectionId) ??
      this.baseAppointmentRows()
    );
  });
  protected readonly canSaveAppointment = computed(
    () => this.appointmentDateTimeInput().trim().length > 0,
  );

  ngOnInit(): void {
    // Defensive reset in case stale UI state survives a hot-reload/navigation edge case.
    this.isAppointmentModalOpen.set(false);
    this.isAssignInspectorModalOpen.set(false);
    this.isNoteModalOpen.set(false);
    this.isDeleteNoteModalOpen.set(false);
    this.isDocumentModalOpen.set(false);
    this.isDeleteDocumentModalOpen.set(false);
  }

  protected selectTab(tab: DetailsTab): void {
    this.activeTab.set(tab);
  }

  protected requiresAttention(status: SelectableInspectionStatus): boolean {
    return (
      status === 'Pending' ||
      status === 'Planned' ||
      status === 'Unsatisfactory' ||
      status === 'Marginal' ||
      status === 'Canceled'
    );
  }

  protected updateInspectionStatus(event: Event): void {
    const nextStatus = (event.target as HTMLSelectElement).value as SelectableInspectionStatus;

    this.inspectionStatusByInspection.update((existing) => ({
      ...existing,
      [this.inspection().inspectionId]: nextStatus,
    }));
  }

  protected isAssigned(assignee: string): boolean {
    return assignee !== 'Unassigned';
  }

  protected openAppointmentModal(): void {
    const appointment = this.appointmentRows()[0];
    if (!appointment) {
      return;
    }

    this.openAppointmentRowModal(appointment, 0);
  }

  protected openNewAppointmentModal(): void {
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.appointmentModalMode.set('create');
    this.activeAppointmentIndex.set(null);
    this.appointmentDateTimeInput.set('');
    this.appointmentLocationInput.set('');
    this.appointmentCommentsInput.set('');
    this.appointmentStatusInput.set('Scheduled');
    this.appointmentValidationMessage.set('');
    this.isAppointmentModalOpen.set(true);
  }

  protected openAppointmentRowModal(appointment: AppointmentRow, index: number): void {
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.appointmentModalMode.set('edit');
    this.activeAppointmentIndex.set(index);
    this.appointmentDateTimeInput.set(appointment.dateTime);
    this.appointmentLocationInput.set(appointment.location);
    this.appointmentCommentsInput.set(appointment.comments);
    this.appointmentStatusInput.set(appointment.status);
    this.appointmentValidationMessage.set('');
    this.isAppointmentModalOpen.set(true);
  }

  protected closeAppointmentModal(): void {
    this.isAppointmentModalOpen.set(false);
    this.appointmentValidationMessage.set('');
    this.activeAppointmentIndex.set(null);
  }

  protected openAssignInspectorModal(): void {
    this.closeAppointmentModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.inspectorSearchTerm.set('');
    this.inspectorStatusFilter.set('All');
    this.isAssignInspectorModalOpen.set(true);
  }

  protected closeAssignInspectorModal(): void {
    this.isAssignInspectorModalOpen.set(false);
  }

  protected updateInspectorSearchTerm(event: Event): void {
    this.inspectorSearchTerm.set((event.target as HTMLInputElement).value);
  }

  protected updateSummaryInspector(event: Event): void {
    this.updateSummaryForm({ inspector: (event.target as HTMLInputElement).value.trim() });
  }

  protected updateSummaryInspectionReason(event: Event): void {
    this.updateSummaryForm({
      inspectionReason: (event.target as HTMLSelectElement).value as InspectionReasonOption | '',
    });
  }

  protected updateSummaryInspectionType(event: Event): void {
    this.updateSummaryForm({
      inspectionType: (event.target as HTMLSelectElement).value as InspectionTypeOption | '',
    });
  }

  protected saveSummary(): void {
    if (!this.canSaveSummary()) {
      return;
    }

    const inspectionId = this.inspection().inspectionId;
    const nextValue = this.summaryForm();

    this.assignedInspectorByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: nextValue.inspector.trim() || 'Unassigned',
    }));

    this.summaryFormByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: nextValue,
    }));

    this.triggerSaveToast();
  }

  protected setInspectorStatusFilter(filter: InspectorFilter): void {
    this.inspectorStatusFilter.set(filter);
  }

  protected assignInspector(inspector: InspectorOption): void {
    this.assignedInspectorByInspection.update((existing) => ({
      ...existing,
      [this.inspection().inspectionId]: inspector.name,
    }));
    this.updateSummaryForm({ inspector: inspector.name });
    this.closeAssignInspectorModal();
  }

  protected updateAppointmentDateTime(event: Event): void {
    this.appointmentDateTimeInput.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentLocation(event: Event): void {
    this.appointmentLocationInput.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentComments(event: Event): void {
    this.appointmentCommentsInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected updateAppointmentStatus(event: Event): void {
    this.appointmentStatusInput.set((event.target as HTMLSelectElement).value as AppointmentStatus);
  }

  protected saveAppointment(): void {
    const dateTime = this.appointmentDateTimeInput().trim();

    if (!dateTime) {
      this.appointmentValidationMessage.set('Appointment Date/Time is required.');
      return;
    }

    const parsedDateTime = Date.parse(dateTime);
    if (Number.isNaN(parsedDateTime)) {
      this.appointmentValidationMessage.set('Enter a valid Appointment Date/Time.');
      return;
    }

    if (parsedDateTime < Date.now()) {
      this.appointmentValidationMessage.set('Appointment Date/Time cannot be in the past.');
      return;
    }

    this.appointmentValidationMessage.set('');

    const nextAppointment: AppointmentRow = {
      dateTime,
      location: this.appointmentLocationInput().trim(),
      comments: this.appointmentCommentsInput().trim(),
      status: this.appointmentStatusInput(),
    };

    if (this.appointmentModalMode() === 'create') {
      this.updateCurrentAppointments((appointments) => [nextAppointment, ...appointments]);
      this.showAppointmentCreatedToast.set(true);

      if (this.appointmentToastTimeoutId !== null) {
        clearTimeout(this.appointmentToastTimeoutId);
      }

      this.appointmentToastTimeoutId = setTimeout(() => {
        this.showAppointmentCreatedToast.set(false);
        this.appointmentToastTimeoutId = null;
      }, 3000);

      this.closeAppointmentModal();
      return;
    }

    const activeIndex = this.activeAppointmentIndex();

    if (activeIndex === null || !this.canSaveAppointment()) {
      return;
    }

    this.updateCurrentAppointments((appointments) =>
      appointments.map((appointment, index) =>
        index === activeIndex ? nextAppointment : appointment,
      ),
    );

    this.closeAppointmentModal();
  }

  protected openNoteModal(): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.noteModalMode.set('add');
    this.activeNoteIndex.set(null);
    this.noteNameInput.set(this.noteNameOptions()[0] ?? this.inspection().subjectName);
    this.noteDescriptionInput.set('');
    this.isNoteModalOpen.set(true);
  }

  protected closeNoteModal(): void {
    this.isNoteModalOpen.set(false);
    this.noteModalMode.set('add');
    this.activeNoteIndex.set(null);
  }

  protected openEditNoteModal(note: NoteRow, index: number): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.noteModalMode.set('edit');
    this.activeNoteIndex.set(index);
    this.noteNameInput.set(note.name);
    this.noteDescriptionInput.set(note.description);
    this.isNoteModalOpen.set(true);
  }

  protected openDeleteNoteModal(index: number): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.activeNoteIndex.set(index);
    this.isDeleteNoteModalOpen.set(true);
  }

  protected closeDeleteNoteModal(): void {
    this.isDeleteNoteModalOpen.set(false);
    this.activeNoteIndex.set(null);
  }

  protected updateNoteName(event: Event): void {
    this.noteNameInput.set((event.target as HTMLSelectElement).value);
  }

  protected updateNoteDescription(event: Event): void {
    this.noteDescriptionInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected saveNote(): void {
    if (!this.canSaveNote()) {
      return;
    }

    const nextNote: NoteRow = {
      name: this.noteNameInput().trim(),
      updatedDate: this.formatToday(),
      updatedBy: this.isAssigned(this.assignedInspector()) ? this.assignedInspector() : 'N/A',
      description: this.noteDescriptionInput().trim(),
    };

    if (this.noteModalMode() === 'edit' && this.activeNoteIndex() !== null) {
      this.updateCurrentNotes((notes) =>
        notes.map((note, index) => (index === this.activeNoteIndex() ? nextNote : note)),
      );
    } else {
      this.updateCurrentNotes((notes) => [nextNote, ...notes]);
    }

    this.closeNoteModal();
  }

  protected confirmDeleteNote(): void {
    const activeIndex = this.activeNoteIndex();

    if (activeIndex === null) {
      return;
    }

    this.updateCurrentNotes((notes) => notes.filter((_, index) => index !== activeIndex));
    this.closeDeleteNoteModal();
  }

  protected openDocumentModal(): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDeleteDocumentModal();
    this.documentModalMode.set('add');
    this.activeDocumentIndex.set(null);
    this.documentNameInput.set(this.noteNameOptions()[0] ?? this.inspection().subjectName);
    this.documentFileNameInput.set('');
    this.documentUploadName.set('');
    this.isDocumentModalOpen.set(true);
  }

  protected closeDocumentModal(): void {
    this.isDocumentModalOpen.set(false);
    this.documentModalMode.set('add');
    this.activeDocumentIndex.set(null);
  }

  protected openEditDocumentModal(document: DocumentRow, index: number): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDeleteDocumentModal();
    this.documentModalMode.set('edit');
    this.activeDocumentIndex.set(index);
    this.documentNameInput.set(document.name);
    this.documentFileNameInput.set(document.fileName);
    this.documentUploadName.set(document.fileName);
    this.isDocumentModalOpen.set(true);
  }

  protected openDeleteDocumentModal(index: number): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.activeDocumentIndex.set(index);
    this.isDeleteDocumentModalOpen.set(true);
  }

  protected closeDeleteDocumentModal(): void {
    this.isDeleteDocumentModalOpen.set(false);
    this.activeDocumentIndex.set(null);
  }

  protected updateDocumentName(event: Event): void {
    this.documentNameInput.set((event.target as HTMLSelectElement).value);
  }

  protected updateDocumentFileName(event: Event): void {
    this.documentFileNameInput.set((event.target as HTMLInputElement).value);
  }

  protected updateDocumentUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.documentUploadName.set(file.name);

    if (!this.documentFileNameInput().trim()) {
      this.documentFileNameInput.set(file.name);
    }
  }

  protected saveDocument(): void {
    if (!this.canSaveDocument()) {
      return;
    }

    const nextDocument: DocumentRow = {
      name: this.documentNameInput().trim(),
      fileName: this.documentFileNameInput().trim(),
      updatedDate: this.formatToday(),
    };

    if (this.documentModalMode() === 'edit' && this.activeDocumentIndex() !== null) {
      this.updateCurrentDocuments((documents) =>
        documents.map((document, index) =>
          index === this.activeDocumentIndex() ? nextDocument : document,
        ),
      );
    } else {
      this.updateCurrentDocuments((documents) => [nextDocument, ...documents]);
    }

    this.closeDocumentModal();
  }

  protected confirmDeleteDocument(): void {
    const activeIndex = this.activeDocumentIndex();

    if (activeIndex === null) {
      return;
    }

    this.updateCurrentDocuments((documents) =>
      documents.filter((_, index) => index !== activeIndex),
    );
    this.closeDeleteDocumentModal();
  }

  protected downloadDocument(documentRow: DocumentRow): void {
    const content = [
      `Document Name: ${documentRow.name}`,
      `File Name: ${documentRow.fileName}`,
      `Updated Date: ${documentRow.updatedDate}`,
      `Inspection ID: ${this.inspection().inspectionId}`,
      `Subject Name: ${this.inspection().subjectName}`,
    ].join('\r\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `${documentRow.fileName.replace(/[^a-z0-9._-]+/gi, '_') || 'document'}.txt`;
    anchor.click();
    URL.revokeObjectURL(objectUrl);
  }

  protected handleEscape(): void {
    if (this.isAssignInspectorModalOpen()) {
      this.closeAssignInspectorModal();
      return;
    }

    if (this.isDeleteDocumentModalOpen()) {
      this.closeDeleteDocumentModal();
      return;
    }

    if (this.isDocumentModalOpen()) {
      this.closeDocumentModal();
      return;
    }

    if (this.isDeleteNoteModalOpen()) {
      this.closeDeleteNoteModal();
      return;
    }

    if (this.isNoteModalOpen()) {
      this.closeNoteModal();
      return;
    }

    if (this.isAppointmentModalOpen()) {
      this.closeAppointmentModal();
    }
  }

  private formatToday(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
      .format(new Date())
      .replace(/\//g, '-');
  }

  private updateCurrentNotes(updater: (notes: NoteRow[]) => NoteRow[]): void {
    const inspectionId = this.inspection().inspectionId;
    const currentNotes = this.noteRows();

    this.noteRowsByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: updater([...currentNotes]),
    }));
  }

  private updateCurrentDocuments(updater: (documents: DocumentRow[]) => DocumentRow[]): void {
    const inspectionId = this.inspection().inspectionId;
    const currentDocuments = this.documentRows();

    this.documentRowsByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: updater([...currentDocuments]),
    }));
  }

  private updateCurrentAppointments(
    updater: (appointments: AppointmentRow[]) => AppointmentRow[],
  ): void {
    const inspectionId = this.inspection().inspectionId;
    const currentAppointments = this.appointmentRows();

    this.appointmentRowsByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: updater([...currentAppointments]),
    }));
  }

  private getDefaultAppointmentStatus(): AppointmentStatus {
    const currentStatus = this.currentInspectionStatus();

    if (currentStatus === 'Canceled') {
      return 'Canceled';
    }

    if (
      currentStatus === 'Pending' ||
      currentStatus === 'Scheduled' ||
      currentStatus === 'Planned'
    ) {
      return 'Scheduled';
    }

    return 'Completed';
  }

  private triggerSaveToast(): void {
    this.showSaveToast.set(true);

    if (this.saveToastTimeoutId !== null) {
      clearTimeout(this.saveToastTimeoutId);
    }

    this.saveToastTimeoutId = setTimeout(() => {
      this.showSaveToast.set(false);
      this.saveToastTimeoutId = null;
    }, 3000);
  }

  private updateSummaryForm(update: Partial<SummaryFormValue>): void {
    const inspectionId = this.inspection().inspectionId;
    const current = this.summaryForm();

    this.summaryFormByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: {
        ...current,
        ...update,
      },
    }));
  }
}
