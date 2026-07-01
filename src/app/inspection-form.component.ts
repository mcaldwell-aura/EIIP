import { toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';

import { InspectionStoreService, type InspectionFormStatus } from './inspection-store.service';
import { NavMenuService } from './nav-menu.service';

@Component({
  selector: 'app-inspection-form',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspection-form.component.html',
  styleUrl: './inspection-form.component.scss',
})
export class InspectionFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inspectionStore = inject(InspectionStoreService);
  protected readonly menuService = inject(NavMenuService);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly inspectionId = computed(() => this.paramMap().get('inspectionId') ?? '');
  private readonly formIdFromPath = computed(() => {
    const match = this.router.url.match(/\/forms\/([^/?]+)/);
    return match?.[1] ? decodeURIComponent(match[1]).trim() : '';
  });
  protected readonly formId = computed(
    () => this.paramMap().get('formId')?.trim() || this.formIdFromPath(),
  );
  protected readonly isNewForm = computed(() => this.queryParamMap().get('isNew') === 'true');
  protected readonly formMode = computed<'view' | 'edit'>(() =>
    this.queryParamMap().get('mode') === 'edit' ? 'edit' : 'view',
  );
  protected readonly selectedFormType = computed(
    () => this.queryParamMap().get('formType')?.trim() ?? '',
  );
  protected readonly draftFormId = computed(
    () => this.queryParamMap().get('draftFormId')?.trim() ?? '',
  );
  protected readonly headerFormId = computed(() => {
    const routeFormId = this.formId();

    if (routeFormId && routeFormId !== 'new') {
      return routeFormId;
    }

    if (this.draftFormId()) {
      return this.draftFormId();
    }

    return 'New';
  });
  protected readonly isEditable = computed(() => this.formMode() === 'edit');
  protected readonly inspection = computed(
    () =>
      this.inspectionStore
        .inspections()
        .find((inspection) => inspection.inspectionId === this.inspectionId()) ?? null,
  );
  protected readonly formRecord = computed(() => {
    const inspectionId = this.inspectionId();
    const formId = this.formId();

    if (!inspectionId || !formId || this.isNewForm()) {
      return null;
    }

    return this.inspectionStore.getInspectionFormById(inspectionId, formId);
  });
  protected readonly backRoute = computed(() => [
    '/inspection-overview/inspection',
    this.inspectionId(),
  ]);
  protected readonly headerFormName = computed(() => {
    if (this.formRecord()?.formType) {
      return this.formRecord()!.formType;
    }

    if (this.selectedFormType()) {
      return this.selectedFormType();
    }

    return 'Inspection Form';
  });
  protected readonly statusOptions: Array<{
    label: InspectionFormStatus;
    value: InspectionFormStatus;
  }> = [
    { label: 'Scheduled', value: 'Scheduled' },
    { label: 'In Progress', value: 'In Progress' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Overdue', value: 'Overdue' },
  ];

  protected readonly appointmentDateTimeInput = signal('');
  protected readonly inspectorInput = signal('');
  protected readonly statusInput = signal<InspectionFormStatus>('Scheduled');
  protected readonly commentsInput = signal('');
  protected readonly showSavedToast = signal(false);
  protected readonly hasRenderableForm = computed(
    () => this.isNewForm() || this.formRecord() !== null,
  );
  private readonly hydrateFormEffect = effect(() => {
    const existingForm = this.formRecord();

    if (existingForm) {
      this.appointmentDateTimeInput.set(
        this.toDateTimeInputValue(existingForm.appointmentDateTime),
      );
      this.inspectorInput.set(existingForm.inspector);
      this.statusInput.set(existingForm.status);
      this.commentsInput.set(existingForm.comments);
      return;
    }

    if (this.isNewForm()) {
      const now = new Date();
      const defaultInspector = this.inspection()?.assignedInspector ?? 'Unassigned';

      this.appointmentDateTimeInput.set(this.toDateTimeInputValue(now.toISOString()));
      this.inspectorInput.set(defaultInspector);
      this.statusInput.set('Scheduled');
      this.commentsInput.set('');
    }
  });

  protected updateAppointmentDateTime(event: Event): void {
    this.appointmentDateTimeInput.set((event.target as HTMLInputElement).value);
  }

  protected updateInspector(event: Event): void {
    this.inspectorInput.set((event.target as HTMLInputElement).value);
  }

  protected updateStatus(value: string | null): void {
    if (!value) {
      return;
    }

    this.statusInput.set(value as InspectionFormStatus);
  }

  protected updateComments(event: Event): void {
    this.commentsInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected saveForm(): void {
    if (!this.isEditable()) {
      return;
    }

    const inspectionId = this.inspectionId();
    const formId = this.formId();

    if (!inspectionId || !formId || !this.appointmentDateTimeInput().trim()) {
      return;
    }

    if (this.isNewForm()) {
      if (!this.selectedFormType()) {
        return;
      }

      const createFormId = formId && formId !== 'new' ? formId : this.draftFormId() || undefined;

      this.inspectionStore.createInspectionForm({
        inspectionId,
        formType: this.selectedFormType(),
        formId: createFormId,
        appointmentDateTime: this.appointmentDateTimeInput(),
        inspector: this.inspectorInput().trim() || 'Unassigned',
        status: this.statusInput(),
        comments: this.commentsInput().trim(),
      });
    } else {
      this.inspectionStore.updateInspectionForm({
        inspectionId,
        formId,
        changes: {
          appointmentDateTime: this.appointmentDateTimeInput(),
          inspector: this.inspectorInput().trim() || 'Unassigned',
          status: this.statusInput(),
          comments: this.commentsInput().trim(),
        },
      });
    }

    this.showSavedToast.set(true);

    setTimeout(() => {
      this.showSavedToast.set(false);
      this.goBackToFormsTab();
    }, 1200);
  }

  protected cancelEdit(): void {
    this.goBackToFormsTab();
  }

  protected goBackToFormsTab(): void {
    this.router.navigate(this.backRoute(), {
      queryParams: { tab: 'forms' },
    });
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
