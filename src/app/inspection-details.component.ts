import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { INSPECTIONS, type InspectionRecord, type InspectionStatus } from './inspection-data';

type DetailsTab = 'summary' | 'notes' | 'documents';

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

type AppointmentOption = {
  date: string;
  time: string;
  location: string;
};

type NoteModalMode = 'add' | 'edit';
type DocumentModalMode = 'add' | 'edit';
type InspectorStatus = 'Available' | 'Busy' | 'Offline';
type InspectorFilter = 'All' | InspectorStatus;

type InspectorOption = {
  name: string;
  status: InspectorStatus;
};

@Component({
  selector: 'app-inspection-details',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
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
  protected readonly activeNoteIndex = signal<number | null>(null);
  protected readonly activeDocumentIndex = signal<number | null>(null);
  protected readonly inspectionId = computed(
    () => this.paramMap().get('inspectionId') ?? INSPECTIONS[0].inspectionId,
  );
  private readonly assignedInspectorByInspection = signal<Record<string, string>>({});
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
    () => INSPECTIONS.find((item) => item.inspectionId === this.inspectionId()) ?? INSPECTIONS[0],
  );
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
  protected readonly appointmentDateInput = signal('');
  protected readonly appointmentTimeInput = signal('');
  protected readonly appointmentLocationInput = signal('');
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
  protected readonly upcomingAppointments = computed<AppointmentOption[]>(() => {
    const current = {
      date: this.inspection().appointmentDate,
      time: this.inspection().appointmentTime,
      location: this.inspection().appointmentLocation,
    };

    return [
      current,
      {
        date: current.date,
        time: current.time,
        location: current.location,
      },
      {
        date: current.date,
        time: current.time,
        location: current.location,
      },
    ];
  });

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

  protected requiresAttention(status: InspectionStatus): boolean {
    return status === 'Planned' || status === 'Unsatisfactory';
  }

  protected isAssigned(assignee: string): boolean {
    return assignee !== 'Unassigned';
  }

  protected openAppointmentModal(): void {
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDocumentModal();
    this.closeDeleteDocumentModal();
    this.appointmentDateInput.set(this.inspection().appointmentDate);
    this.appointmentTimeInput.set(this.inspection().appointmentTime);
    this.appointmentLocationInput.set(this.inspection().appointmentLocation);
    this.isAppointmentModalOpen.set(true);
  }

  protected closeAppointmentModal(): void {
    this.isAppointmentModalOpen.set(false);
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

  protected setInspectorStatusFilter(filter: InspectorFilter): void {
    this.inspectorStatusFilter.set(filter);
  }

  protected assignInspector(inspector: InspectorOption): void {
    this.assignedInspectorByInspection.update((existing) => ({
      ...existing,
      [this.inspection().inspectionId]: inspector.name,
    }));
    this.closeAssignInspectorModal();
  }

  protected updateAppointmentDate(event: Event): void {
    this.appointmentDateInput.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentTime(event: Event): void {
    this.appointmentTimeInput.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentLocation(event: Event): void {
    this.appointmentLocationInput.set((event.target as HTMLInputElement).value);
  }

  protected selectAppointment(appointment: AppointmentOption): void {
    this.appointmentDateInput.set(appointment.date);
    this.appointmentTimeInput.set(appointment.time);
    this.appointmentLocationInput.set(appointment.location);
  }

  protected continueAppointmentUpdate(): void {
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
}
