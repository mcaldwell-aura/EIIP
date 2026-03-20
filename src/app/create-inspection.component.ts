import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

type CreateInspectionTab = 'summary' | 'notes' | 'documents';
type InspectorStatus = 'Available' | 'Busy' | 'Offline';
type InspectorFilter = 'All' | InspectorStatus;

type InspectorOption = {
  name: string;
  status: InspectorStatus;
};

type DraftNoteRow = {
  name: string;
  description: string;
  updatedDate: string;
  updatedBy: string;
};

type DraftDocumentRow = {
  name: string;
  fileName: string;
  updatedDate: string;
};

@Component({
  selector: 'app-create-inspection',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  templateUrl: './create-inspection.component.html',
  styleUrl: './create-inspection.component.scss',
})
export class CreateInspectionComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'eiip-create-inspection-draft';

  protected readonly activeTab = signal<CreateInspectionTab>('summary');
  protected readonly isAssignInspectorModalOpen = signal(false);
  protected readonly isAppointmentModalOpen = signal(false);
  protected readonly isNoteModalOpen = signal(false);
  protected readonly isDocumentModalOpen = signal(false);

  protected readonly inspectionIdInput = signal('');
  protected readonly inspectionStatusInput = signal('');
  protected readonly inspectionTypeInput = signal('');
  protected readonly subjectNameInput = signal('');
  protected readonly assignedInspectorInput = signal('');
  protected readonly inspectionReasonInput = signal('');

  protected readonly appointmentDateInput = signal('');
  protected readonly appointmentTimeInput = signal('');
  protected readonly appointmentLocationInput = signal('');

  protected readonly appointmentDateDraft = signal('');
  protected readonly appointmentTimeDraft = signal('');
  protected readonly appointmentLocationDraft = signal('');
  protected readonly noteNameInput = signal('');
  protected readonly noteDescriptionInput = signal('');
  protected readonly documentNameInput = signal('');
  protected readonly documentFileNameInput = signal('');
  protected readonly documentUploadName = signal('');
  protected readonly noteRows = signal<DraftNoteRow[]>([]);
  protected readonly documentRows = signal<DraftDocumentRow[]>([]);

  protected readonly inspectorSearchTerm = signal('');
  protected readonly inspectorStatusFilter = signal<InspectorFilter>('All');
  private readonly savedSnapshot = signal('');
  private readonly saveAcknowledged = signal(false);

  private readonly inspectorOptions = signal<InspectorOption[]>([
    { name: 'John Doe', status: 'Available' },
    { name: 'Jamie Smith', status: 'Busy' },
    { name: 'Taylor Brooks', status: 'Available' },
    { name: 'Morgan Chen', status: 'Offline' },
    { name: 'Riley Carter', status: 'Available' },
    { name: 'Alex Johnson', status: 'Busy' },
  ]);

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

  private readonly formSnapshot = computed(() =>
    JSON.stringify({
      inspectionId: this.inspectionIdInput(),
      inspectionStatus: this.inspectionStatusInput(),
      inspectionType: this.inspectionTypeInput(),
      subjectName: this.subjectNameInput(),
      assignedInspector: this.assignedInspectorInput(),
      inspectionReason: this.inspectionReasonInput(),
      appointmentDate: this.appointmentDateInput(),
      appointmentTime: this.appointmentTimeInput(),
      appointmentLocation: this.appointmentLocationInput(),
      notes: this.noteRows(),
      documents: this.documentRows(),
    }),
  );

  protected readonly hasAnyContent = computed(() =>
    [
      this.inspectionIdInput(),
      this.inspectionStatusInput(),
      this.inspectionTypeInput(),
      this.subjectNameInput(),
      this.assignedInspectorInput(),
      this.inspectionReasonInput(),
      this.appointmentDateInput(),
      this.appointmentTimeInput(),
      this.appointmentLocationInput(),
      this.noteRows().length > 0 ? 'notes' : '',
      this.documentRows().length > 0 ? 'documents' : '',
    ].some((value) => value.trim().length > 0),
  );

  protected readonly hasUnsavedChanges = computed(
    () => this.hasAnyContent() && this.formSnapshot() !== this.savedSnapshot(),
  );

  protected readonly saveButtonLabel = computed(() => 'Save');

  protected readonly saveHelperText = computed(() => {
    if (this.saveAcknowledged() && !this.hasUnsavedChanges()) {
      return 'Draft saved locally.';
    }

    return '';
  });

  protected readonly canSaveAppointmentDraft = computed(
    () =>
      this.appointmentDateDraft().trim().length > 0 ||
      this.appointmentTimeDraft().trim().length > 0 ||
      this.appointmentLocationDraft().trim().length > 0,
  );

  protected readonly canSaveNote = computed(
    () => this.noteNameInput().trim().length > 0 && this.noteDescriptionInput().trim().length > 0,
  );

  protected readonly canSaveDocument = computed(
    () =>
      this.documentNameInput().trim().length > 0 && this.documentFileNameInput().trim().length > 0,
  );

  constructor() {
    this.restoreSavedDraft();
  }

  protected selectTab(tab: CreateInspectionTab): void {
    this.activeTab.set(tab);
  }

  protected updateInspectionId(event: Event): void {
    this.inspectionIdInput.set((event.target as HTMLInputElement).value);
    this.saveAcknowledged.set(false);
  }

  protected updateInspectionStatus(event: Event): void {
    this.inspectionStatusInput.set((event.target as HTMLInputElement).value);
    this.saveAcknowledged.set(false);
  }

  protected updateInspectionType(event: Event): void {
    this.inspectionTypeInput.set((event.target as HTMLInputElement).value);
    this.saveAcknowledged.set(false);
  }

  protected updateSubjectName(event: Event): void {
    this.subjectNameInput.set((event.target as HTMLInputElement).value);
    this.saveAcknowledged.set(false);
  }

  protected updateInspectionReason(event: Event): void {
    this.inspectionReasonInput.set((event.target as HTMLTextAreaElement).value);
    this.saveAcknowledged.set(false);
  }

  protected openAssignInspectorModal(): void {
    this.closeAppointmentModal();
    this.closeNoteModal();
    this.closeDocumentModal();
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
    this.assignedInspectorInput.set(inspector.name);
    this.saveAcknowledged.set(false);
    this.closeAssignInspectorModal();
  }

  protected openAppointmentModal(): void {
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDocumentModal();
    this.appointmentDateDraft.set(this.appointmentDateInput());
    this.appointmentTimeDraft.set(this.appointmentTimeInput());
    this.appointmentLocationDraft.set(this.appointmentLocationInput());
    this.isAppointmentModalOpen.set(true);
  }

  protected closeAppointmentModal(): void {
    this.isAppointmentModalOpen.set(false);
  }

  protected updateAppointmentDateDraft(event: Event): void {
    this.appointmentDateDraft.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentTimeDraft(event: Event): void {
    this.appointmentTimeDraft.set((event.target as HTMLInputElement).value);
  }

  protected updateAppointmentLocationDraft(event: Event): void {
    this.appointmentLocationDraft.set((event.target as HTMLInputElement).value);
  }

  protected saveAppointmentDraft(): void {
    if (!this.canSaveAppointmentDraft()) {
      return;
    }

    this.appointmentDateInput.set(this.appointmentDateDraft().trim());
    this.appointmentTimeInput.set(this.appointmentTimeDraft().trim());
    this.appointmentLocationInput.set(this.appointmentLocationDraft().trim());
    this.saveAcknowledged.set(false);
    this.closeAppointmentModal();
  }

  protected openNoteModal(): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeDocumentModal();
    this.noteNameInput.set('');
    this.noteDescriptionInput.set('');
    this.isNoteModalOpen.set(true);
  }

  protected closeNoteModal(): void {
    this.isNoteModalOpen.set(false);
  }

  protected updateNoteName(event: Event): void {
    this.noteNameInput.set((event.target as HTMLInputElement).value);
  }

  protected updateNoteDescription(event: Event): void {
    this.noteDescriptionInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected saveNote(): void {
    if (!this.canSaveNote()) {
      return;
    }

    this.noteRows.update((rows) => [
      {
        name: this.noteNameInput().trim(),
        description: this.noteDescriptionInput().trim(),
        updatedDate: this.formatToday(),
        updatedBy: this.assignedInspectorInput().trim() || 'N/A',
      },
      ...rows,
    ]);
    this.saveAcknowledged.set(false);
    this.closeNoteModal();
  }

  protected openDocumentModal(): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.documentNameInput.set('');
    this.documentFileNameInput.set('');
    this.documentUploadName.set('');
    this.isDocumentModalOpen.set(true);
  }

  protected closeDocumentModal(): void {
    this.isDocumentModalOpen.set(false);
  }

  protected updateDocumentName(event: Event): void {
    this.documentNameInput.set((event.target as HTMLInputElement).value);
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

    this.documentRows.update((rows) => [
      {
        name: this.documentNameInput().trim(),
        fileName: this.documentFileNameInput().trim(),
        updatedDate: this.formatToday(),
      },
      ...rows,
    ]);
    this.saveAcknowledged.set(false);
    this.closeDocumentModal();
  }

  protected saveInspection(): void {
    if (!this.hasUnsavedChanges()) {
      return;
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          inspectionId: this.inspectionIdInput(),
          inspectionStatus: this.inspectionStatusInput(),
          inspectionType: this.inspectionTypeInput(),
          subjectName: this.subjectNameInput(),
          assignedInspector: this.assignedInspectorInput(),
          inspectionReason: this.inspectionReasonInput(),
          appointmentDate: this.appointmentDateInput(),
          appointmentTime: this.appointmentTimeInput(),
          appointmentLocation: this.appointmentLocationInput(),
          notes: this.noteRows(),
          documents: this.documentRows(),
        }),
      );
    }

    this.savedSnapshot.set(this.formSnapshot());
    this.saveAcknowledged.set(true);
  }

  protected handleEscape(): void {
    if (this.isAssignInspectorModalOpen()) {
      this.closeAssignInspectorModal();
      return;
    }

    if (this.isDocumentModalOpen()) {
      this.closeDocumentModal();
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
    }).format(new Date());
  }

  private restoreSavedDraft(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const savedDraft = localStorage.getItem(this.storageKey);

    if (!savedDraft) {
      return;
    }

    try {
      const draft = JSON.parse(savedDraft) as Partial<{
        inspectionId: string;
        inspectionStatus: string;
        inspectionType: string;
        subjectName: string;
        assignedInspector: string;
        inspectionReason: string;
        appointmentDate: string;
        appointmentTime: string;
        appointmentLocation: string;
        notes: DraftNoteRow[];
        documents: DraftDocumentRow[];
      }>;

      this.inspectionIdInput.set(draft.inspectionId ?? '');
      this.inspectionStatusInput.set(draft.inspectionStatus ?? '');
      this.inspectionTypeInput.set(draft.inspectionType ?? '');
      this.subjectNameInput.set(draft.subjectName ?? '');
      this.assignedInspectorInput.set(draft.assignedInspector ?? '');
      this.inspectionReasonInput.set(draft.inspectionReason ?? '');
      this.appointmentDateInput.set(draft.appointmentDate ?? '');
      this.appointmentTimeInput.set(draft.appointmentTime ?? '');
      this.appointmentLocationInput.set(draft.appointmentLocation ?? '');
      this.noteRows.set(Array.isArray(draft.notes) ? draft.notes : []);
      this.documentRows.set(Array.isArray(draft.documents) ? draft.documents : []);
      this.savedSnapshot.set(this.formSnapshot());
      this.saveAcknowledged.set(this.hasAnyContent());
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }
}
