import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';

import {
  InspectionStoreService,
  type InspectionFormRecord,
  type InspectionFormStatus,
} from './inspection-store.service';
import { NavMenuService } from './nav-menu.service';

type FormDraft = {
  appointmentDateTime: string;
  inspector: string;
  status: InspectionFormStatus;
  comments: string;
};

@Component({
  selector: 'app-forms-mockup-accordion',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    DialogModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forms-mockup-accordion.component.html',
  styleUrl: './forms-mockup-accordion.component.scss',
})
export class FormsMockupAccordionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly inspectionStore = inject(InspectionStoreService);
  protected readonly menuService = inject(NavMenuService);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  private saveToastTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected readonly showSavedToast = signal(false);
  protected readonly expandedFormId = signal<string | null>(null);
  protected readonly isAddFormModalOpen = signal(false);
  protected readonly selectedFormTypeInput = signal('');
  protected readonly isCreatingInspectionForm = signal(false);
  private readonly draftByFormId = signal<Record<string, FormDraft>>({});
  protected readonly availableFormTypes: readonly string[] = [
    'Evidence Checklist',
    'Overt Observation Form',
    'Covert Observation Form',
  ];

  protected readonly statusOptions: Array<{
    label: InspectionFormStatus;
    value: InspectionFormStatus;
  }> = [
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Overdue', value: 'Overdue' },
  ];
  protected readonly formTypeSelectOptions = this.availableFormTypes.map((formType) => ({
    label: formType,
    value: formType,
  }));
  protected readonly canAddForm = computed(
    () => this.selectedFormTypeInput().trim().length > 0 && !this.isCreatingInspectionForm(),
  );

  protected readonly inspectionId = computed(() => {
    const requestedInspectionId = this.queryParamMap().get('inspectionId')?.trim() ?? '';
    const inspections = this.inspectionStore.inspections();

    if (
      requestedInspectionId &&
      inspections.some((inspection) => inspection.inspectionId === requestedInspectionId)
    ) {
      return requestedInspectionId;
    }

    const firstWithForms = inspections.find(
      (inspection) => this.inspectionStore.getInspectionForms(inspection.inspectionId).length > 0,
    );

    return firstWithForms?.inspectionId ?? inspections[0]?.inspectionId ?? '';
  });

  protected readonly inspection = computed(() => {
    const inspectionId = this.inspectionId();

    return (
      this.inspectionStore
        .inspections()
        .find((inspection) => inspection.inspectionId === inspectionId) ?? null
    );
  });

  protected readonly forms = computed<InspectionFormRecord[]>(() => {
    const inspectionId = this.inspectionId();
    const rows = this.inspectionStore.getInspectionForms(inspectionId);

    return [...rows].sort(
      (leftRow, rightRow) =>
        this.parseSortableTimestamp(rightRow.appointmentDateTime) -
        this.parseSortableTimestamp(leftRow.appointmentDateTime),
    );
  });

  protected toggleForm(formId: string): void {
    this.expandedFormId.update((currentId) => (currentId === formId ? null : formId));
  }

  protected isExpanded(formId: string): boolean {
    return this.expandedFormId() === formId;
  }

  protected getDraft(form: InspectionFormRecord): FormDraft {
    const existingDraft = this.draftByFormId()[form.formId];

    if (existingDraft) {
      return existingDraft;
    }

    return {
      appointmentDateTime: this.toDateTimeInputValue(form.appointmentDateTime),
      inspector: form.inspector,
      status: form.status,
      comments: form.comments,
    };
  }

  protected updateDraftField(
    form: InspectionFormRecord,
    field: keyof FormDraft,
    value: string | InspectionFormStatus,
  ): void {
    this.draftByFormId.update((existing) => {
      const currentDraft = this.getDraft(form);

      return {
        ...existing,
        [form.formId]: {
          ...currentDraft,
          [field]: value,
        },
      };
    });
  }

  protected saveForm(form: InspectionFormRecord): void {
    const inspectionId = this.inspectionId();

    if (!inspectionId) {
      return;
    }

    const draft = this.getDraft(form);

    this.inspectionStore.updateInspectionForm({
      inspectionId,
      formId: form.formId,
      changes: {
        appointmentDateTime: draft.appointmentDateTime,
        inspector: draft.inspector.trim() || 'Unassigned',
        status: draft.status,
        comments: draft.comments.trim(),
      },
    });

    this.clearDraft(form.formId);
    this.triggerSavedToast();
  }

  protected cancelForm(formId: string): void {
    this.clearDraft(formId);
  }

  protected formatAppointmentDate(value: string): string {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      return value || 'N/A';
    }

    const date = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(parsedDate);
    const time = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsedDate);

    return `${date} ${time}`;
  }

  protected openAddFormModal(): void {
    this.selectedFormTypeInput.set('');
    this.isAddFormModalOpen.set(true);
  }

  protected closeAddFormModal(): void {
    this.isAddFormModalOpen.set(false);
    this.selectedFormTypeInput.set('');
  }

  protected updateSelectedFormType(value: string | null): void {
    this.selectedFormTypeInput.set(value ?? '');
  }

  protected addInspectionForm(): void {
    if (!this.canAddForm()) {
      return;
    }

    const inspectionId = this.inspectionId();

    if (!inspectionId) {
      return;
    }

    this.isCreatingInspectionForm.set(true);

    const createdForm = this.inspectionStore.createInspectionForm({
      inspectionId,
      formType: this.selectedFormTypeInput(),
      status: 'Scheduled',
    });

    this.closeAddFormModal();
    this.expandedFormId.set(createdForm.formId);
    this.isCreatingInspectionForm.set(false);
  }

  private clearDraft(formId: string): void {
    this.draftByFormId.update((existing) => {
      const next = { ...existing };
      delete next[formId];
      return next;
    });
  }

  private triggerSavedToast(): void {
    if (this.saveToastTimeoutId) {
      clearTimeout(this.saveToastTimeoutId);
    }

    this.showSavedToast.set(true);
    this.saveToastTimeoutId = setTimeout(() => {
      this.showSavedToast.set(false);
      this.saveToastTimeoutId = null;
    }, 1200);
  }

  private parseSortableTimestamp(dateTime: string): number {
    const normalized = this.toDateTimeInputValue(dateTime);
    const parsed = normalized ? new Date(normalized).getTime() : Number.NaN;

    if (!Number.isNaN(parsed)) {
      return parsed;
    }

    const fallback = new Date(dateTime).getTime();
    return Number.isNaN(fallback) ? 0 : fallback;
  }

  private toDateTimeInputValue(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (!trimmed) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const parsedDate = new Date(trimmed);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    const year = parsedDate.getFullYear();
    const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsedDate.getDate()}`.padStart(2, '0');
    const hour = `${parsedDate.getHours()}`.padStart(2, '0');
    const minute = `${parsedDate.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }
}
