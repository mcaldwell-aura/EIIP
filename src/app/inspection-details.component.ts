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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { INSPECTIONS, type InspectionRecord, type InspectionStatus } from './inspection-data';
import {
  InspectionStoreService,
  type InspectionFormRecord,
  type StoredAppointmentRow,
} from './inspection-store.service';
import { LocationStoreService } from './location-store.service';
import { NavMenuService } from './nav-menu.service';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { MenuModule } from 'primeng/menu';

type DetailsTab = 'summary' | 'forms' | 'appointments' | 'notes' | 'documents';
type InspectionTypeOption = 'Overt' | 'Covert';
type InspectionFormStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue';

type FormFieldType = 'text' | 'select' | 'textarea' | 'date' | 'time' | 'number';

type FormFieldDef = {
  readonly id: string;
  readonly label: string;
  readonly type: FormFieldType;
  readonly options?: readonly string[];
  readonly placeholder?: string;
  readonly colSpan?: 'full';
};

type FormSectionDef = {
  readonly id: string;
  readonly title: string;
  readonly fields: readonly FormFieldDef[];
};

const FORM_CONTENT_DEFS: Readonly<Record<string, readonly FormSectionDef[]>> = {
  'Evidence Checklist': [
    {
      id: 'vehicle-info',
      title: 'Vehicle info',
      fields: [
        { id: 'vin', label: 'VIN', type: 'text', placeholder: 'Enter VIN number', colSpan: 'full' },
        { id: 'make', label: 'Make', type: 'text', placeholder: 'e.g. Honda' },
        { id: 'model', label: 'Model', type: 'text', placeholder: 'e.g. Accord' },
        { id: 'year', label: 'Year', type: 'text', placeholder: 'e.g. 2003' },
        { id: 'color', label: 'Color', type: 'text', placeholder: 'e.g. Silver' },
        {
          id: 'license-plate',
          label: 'License plate',
          type: 'text',
          placeholder: 'Enter plate number',
          colSpan: 'full',
        },
        { id: 'state', label: 'State', type: 'text', placeholder: 'e.g. AZ' },
        { id: 'mileage', label: 'Mileage', type: 'number', placeholder: '0' },
      ],
    },
    {
      id: 'inspection-results',
      title: 'Inspection results',
      fields: [
        {
          id: 'result-status',
          label: 'Status',
          type: 'select',
          options: ['Satisfactory', 'Unsatisfactory', 'Marginal', 'Pending Review'],
          colSpan: 'full',
        },
        { id: 'result-date', label: 'Date', type: 'date' },
        { id: 'result-time', label: 'Time', type: 'time' },
        { id: 'odometer', label: 'Odometer reading', type: 'number', placeholder: '0' },
        {
          id: 'fuel-level',
          label: 'Fuel level',
          type: 'select',
          options: ['Empty', '1/4', '1/2', '3/4', 'Full'],
        },
        {
          id: 'deficiencies',
          label: 'Deficiencies found',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe any deficiencies observed',
        },
        {
          id: 'corrective-action',
          label: 'Corrective action taken',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe corrective actions if applicable',
        },
      ],
    },
    {
      id: 'documentation',
      title: 'Documentation',
      fields: [
        {
          id: 'reg-number',
          label: 'Registration number',
          type: 'text',
          placeholder: 'e.g. AZ-2024-10938',
        },
        {
          id: 'insurance-number',
          label: 'Insurance policy #',
          type: 'text',
          placeholder: 'Policy number',
        },
        {
          id: 'title-status',
          label: 'Title status',
          type: 'select',
          options: ['Clear', 'Lien', 'Salvage', 'Unknown'],
        },
        {
          id: 'lien-holder',
          label: 'Lien holder (if any)',
          type: 'text',
          placeholder: 'Lender name',
        },
        { id: 'doc-date', label: 'Documentation date', type: 'date' },
        {
          id: 'examiner-ref',
          label: 'Examiner reference #',
          type: 'text',
          placeholder: 'Reference number',
        },
        {
          id: 'doc-notes',
          label: 'Documentation notes',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Enter any relevant documentation notes',
        },
      ],
    },
    {
      id: 'notes',
      title: 'Notes',
      fields: [
        {
          id: 'additional-notes',
          label: 'Additional notes',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Additional observations or comments',
        },
        {
          id: 'follow-up-action',
          label: 'Follow-up action required',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Describe follow-up steps if needed',
        },
        { id: 'next-inspection-date', label: 'Next inspection date', type: 'date' },
        {
          id: 'assigned-inspector',
          label: 'Assigned inspector',
          type: 'text',
          placeholder: 'Inspector name',
        },
      ],
    },
  ],
  'Overt Observation Form': [
    {
      id: 'basic-info',
      title: 'Basic info',
      fields: [
        {
          id: 'obs-location',
          label: 'Observation location',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Enter location',
        },
        { id: 'obs-date', label: 'Observation date', type: 'date' },
        { id: 'obs-time', label: 'Start time', type: 'time' },
        { id: 'obs-inspector', label: 'Inspector name', type: 'text', placeholder: 'Full name' },
        { id: 'obs-id', label: 'Observer ID', type: 'text', placeholder: 'Badge or ID number' },
      ],
    },
    {
      id: 'observations',
      title: 'Observations',
      fields: [
        {
          id: 'subject-behavior',
          label: 'Subject behavior',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe observed behavior',
        },
        {
          id: 'compliance-notes',
          label: 'Compliance notes',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Note any compliance concerns or confirmations',
        },
        {
          id: 'obs-result',
          label: 'Observation result',
          type: 'select',
          options: ['Compliant', 'Non-compliant', 'Inconclusive'],
          colSpan: 'full',
        },
      ],
    },
  ],
  'Covert Observation Form': [
    {
      id: 'basic-info',
      title: 'Basic info',
      fields: [
        {
          id: 'obs-location',
          label: 'Observation location',
          type: 'text',
          colSpan: 'full',
          placeholder: 'Enter location',
        },
        { id: 'obs-date', label: 'Observation date', type: 'date' },
        { id: 'obs-time', label: 'Start time', type: 'time' },
      ],
    },
    {
      id: 'covert-details',
      title: 'Covert details',
      fields: [
        {
          id: 'cover-id',
          label: 'Cover identity used',
          type: 'text',
          placeholder: 'Cover name or alias',
        },
        { id: 'duration', label: 'Duration (mins)', type: 'number', placeholder: '0' },
        {
          id: 'findings',
          label: 'Findings',
          type: 'textarea',
          colSpan: 'full',
          placeholder: 'Describe covert findings in detail',
        },
        {
          id: 'covert-result',
          label: 'Result',
          type: 'select',
          options: ['Compliant', 'Non-compliant', 'Inconclusive'],
          colSpan: 'full',
        },
      ],
    },
  ],
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

type AppointmentStatus = 'Scheduled' | 'Cancelled';

type InspectionReasonOption = 'Change' | 'Original' | 'ReExam' | 'Reinstatement' | 'Periodic';

type SummaryFormValue = {
  candidate: string;
  inspector: string;
  inspectionStatus: SelectableInspectionStatus | '';
  inspectionReason: InspectionReasonOption | '';
  inspectionType: InspectionTypeOption | '';
  inspectionResult: InspectionReasonOption | '';
  completionDate: string;
};

@Component({
  selector: 'app-inspection-details',
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
    DialogModule,
    SelectModule,
    MenuModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  templateUrl: './inspection-details.component.html',
  styleUrl: './inspection-details.component.scss',
})
export class InspectionDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly inspectionStore = inject(InspectionStoreService);
  private readonly locationStore = inject(LocationStoreService);
  protected readonly menuService = inject(NavMenuService);
  private saveToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private appointmentToastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab = signal<DetailsTab>('summary');
  protected readonly isAppointmentModalOpen = signal(false);
  protected readonly isAssignInspectorModalOpen = signal(false);
  protected readonly isNoteModalOpen = signal(false);
  protected readonly isDeleteNoteModalOpen = signal(false);
  protected readonly isDocumentModalOpen = signal(false);
  protected readonly isDeleteDocumentModalOpen = signal(false);
  protected readonly isDeleteFormModalOpen = signal(false);
  protected readonly isAddFormModalOpen = signal(false);
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
    'Cancelled',
  ];
  protected readonly appointmentStatusSelectOptions = this.appointmentStatusOptions.map(
    (status) => ({ label: status, value: status }),
  );
  protected readonly activeLocationOptions = computed(() =>
    this.locationStore
      .locations()
      .filter((location) => location.active)
      .map((location) => ({ label: location.locationName, value: location.locationName })),
  );
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
      inspectionStatus: '',
      inspectionReason: reason,
      inspectionType: type,
      inspectionResult: '',
      completionDate: '',
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
  protected readonly selectedFormTypeInput = signal('');
  protected readonly isCreatingInspectionForm = signal(false);
  protected readonly isFormModalOpen = signal(false);
  protected readonly activeFormId = signal<string | null>(null);
  protected readonly pendingDeleteFormId = signal<string | null>(null);
  protected readonly formDraft = signal<{
    appointmentDateTime: string;
    inspector: string;
    status: InspectionFormStatus;
    comments: string;
  } | null>(null);
  protected readonly isShowingAppointmentSlots = signal(false);
  protected readonly selectedAppointmentSlotForDetails = signal<AppointmentSlot | null>(null);
  protected readonly availableAppointmentSlots: readonly AppointmentSlot[] =
    AVAILABLE_APPOINTMENT_SLOTS;
  protected readonly inspectionFormStatusOptions: readonly InspectionFormStatus[] = [
    'Scheduled',
    'In Progress',
    'Completed',
    'Overdue',
  ];
  protected readonly formStatusSelectOptions = this.inspectionFormStatusOptions.map((status) => ({
    label: status,
    value: status,
  }));
  protected readonly availableFormTypes: readonly string[] = [
    'Evidence Checklist',
    'Overt Observation Form',
    'Covert Observation Form',
  ];
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
        dateTime: this.toDateTimeInputValue(
          `${inspection.appointmentDate} ${inspection.appointmentTime}`.trim(),
        ),
        location: inspection.appointmentLocation,
        comments: inspection.notes[0] ?? '',
        status: currentStatus,
      },
    ];
  });
  protected readonly appointmentRows = computed<AppointmentRow[]>(() => {
    const inspectionId = this.inspection().inspectionId;
    const fromStore = this.inspectionStore.getAppointmentRows(inspectionId);

    if (this.appointmentRowsByInspection()[inspectionId]) {
      return this.appointmentRowsByInspection()[inspectionId] ?? [];
    }

    if (fromStore) {
      return fromStore.map((row) => this.toAppointmentRow(row));
    }

    return this.baseAppointmentRows();
  });
  protected readonly canSaveAppointment = computed(
    () => this.appointmentDateTimeInput().trim().length > 0,
  );
  protected readonly inspectionFormCards = computed<InspectionFormRecord[]>(() => {
    const inspectionId = this.inspection().inspectionId;

    return [...this.inspectionStore.getInspectionForms(inspectionId)].sort(
      (leftRow, rightRow) =>
        this.parseSortableTimestamp(rightRow.appointmentDateTime) -
        this.parseSortableTimestamp(leftRow.appointmentDateTime),
    );
  });
  protected readonly activeForm = computed(() => {
    const formId = this.activeFormId();

    if (!formId) {
      return null;
    }

    return this.inspectionFormCards().find((form) => form.formId === formId) ?? null;
  });
  protected readonly pendingDeleteForm = computed(() => {
    const formId = this.pendingDeleteFormId();

    if (!formId) {
      return null;
    }

    return this.inspectionFormCards().find((form) => form.formId === formId) ?? null;
  });
  protected readonly formTypeSelectOptions = this.availableFormTypes.map((formType) => ({
    label: formType,
    value: formType,
  }));
  protected readonly canAddForm = computed(
    () => this.selectedFormTypeInput().trim().length > 0 && !this.isCreatingInspectionForm(),
  );
  protected readonly activeFormSectionId = signal<string>('');
  private readonly formFieldValuesByFormId = signal<Record<string, Record<string, string>>>({
    '5220': {
      vin: '1HGCM82633A004352',
      make: 'Honda',
      model: 'Accord',
      year: '2003',
      color: 'Silver',
      'license-plate': '',
      state: 'AZ',
      mileage: '0',
      'result-status': 'Satisfactory',
      'result-date': '2026-05-03',
      'result-time': '09:30',
    },
  });
  protected readonly activeFormSections = computed<readonly FormSectionDef[]>(() => {
    const form = this.activeForm();
    if (!form) return [];
    return FORM_CONTENT_DEFS[form.formType] ?? [];
  });
  protected readonly activeFormFieldValues = computed<Record<string, string>>(() => {
    const formId = this.activeFormId();
    if (!formId) return {};
    return this.formFieldValuesByFormId()[formId] ?? {};
  });

  protected getFormFieldValue(fieldId: string): string {
    return this.activeFormFieldValues()[fieldId] ?? '';
  }
  private readonly activeTabFromQueryEffect = effect(() => {
    if (this.queryParamMap().get('tab') === 'forms') {
      this.activeTab.set('forms');
    }
  });

  ngOnInit(): void {
    // Defensive reset in case stale UI state survives a hot-reload/navigation edge case.
    this.isAppointmentModalOpen.set(false);
    this.isAssignInspectorModalOpen.set(false);
    this.isNoteModalOpen.set(false);
    this.isDeleteNoteModalOpen.set(false);
    this.isDocumentModalOpen.set(false);
    this.isDeleteDocumentModalOpen.set(false);
    this.isDeleteFormModalOpen.set(false);
    this.isAddFormModalOpen.set(false);
  }

  protected selectTab(tab: DetailsTab): void {
    this.activeTab.set(tab);
  }

  protected openFormModal(form: InspectionFormRecord): void {
    this.closeDeleteFormModal();
    this.activeFormId.set(form.formId);
    this.formDraft.set({
      appointmentDateTime: this.toDateTimeInputValue(form.appointmentDateTime),
      inspector: form.inspector,
      status: form.status,
      comments: form.comments,
    });
    const sections = FORM_CONTENT_DEFS[form.formType];
    this.activeFormSectionId.set(sections?.[0]?.id ?? '');
    this.isFormModalOpen.set(true);
  }

  protected closeFormModal(): void {
    this.isFormModalOpen.set(false);
    this.activeFormId.set(null);
    this.formDraft.set(null);
    this.activeFormSectionId.set('');
  }

  protected scrollToFormSection(sectionId: string): void {
    this.activeFormSectionId.set(sectionId);
    requestAnimationFrame(() => {
      const scrollBody = document.querySelector<HTMLElement>('.form-sections-body');
      const target = document.getElementById(`form-section-${sectionId}`);
      if (scrollBody && target) {
        const bodyRect = scrollBody.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        scrollBody.scrollTop += targetRect.top - bodyRect.top - 16;
      }
    });
  }

  protected updateFormFieldValue(fieldId: string, value: string): void {
    const formId = this.activeFormId();
    if (!formId) return;
    this.formFieldValuesByFormId.update((existing) => ({
      ...existing,
      [formId]: { ...(existing[formId] ?? {}), [fieldId]: value },
    }));
  }

  protected updateFormDraftField(
    field: 'appointmentDateTime' | 'inspector' | 'status' | 'comments',
    value: string | InspectionFormStatus,
  ): void {
    this.formDraft.update((currentDraft) => {
      if (!currentDraft) {
        return currentDraft;
      }

      return {
        ...currentDraft,
        [field]: value,
      };
    });
  }

  protected saveActiveForm(): void {
    const inspectionId = this.inspection().inspectionId;
    const form = this.activeForm();
    const draft = this.formDraft();

    if (!inspectionId || !form || !draft) {
      return;
    }

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

    this.closeFormModal();
    this.triggerSaveToast();
  }

  protected downloadForm(form: InspectionFormRecord): void {
    // Create a simple text content from the form
    const content = `
Inspection Form Report
=======================

Form ID: ${form.formId}
Form Type: ${form.formType || 'N/A'}
Status: ${form.status}
Appointment Date: ${this.formatFormAppointmentDate(form.appointmentDateTime)}
Inspector: ${form.inspector || 'Unassigned'}
Comments: ${form.comments || 'N/A'}

Generated on: ${new Date().toLocaleString()}
    `.trim();

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `form-${form.formId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  protected openDeleteFormModal(form: InspectionFormRecord): void {
    this.closeFormModal();
    this.pendingDeleteFormId.set(form.formId);
    this.isDeleteFormModalOpen.set(true);
  }

  protected closeDeleteFormModal(): void {
    this.isDeleteFormModalOpen.set(false);
    this.pendingDeleteFormId.set(null);
  }

  protected confirmDeleteForm(): void {
    const form = this.pendingDeleteForm();

    if (!form) {
      return;
    }

    const inspectionId = this.inspection().inspectionId;
    this.inspectionStore.deleteInspectionForm({
      inspectionId,
      formId: form.formId,
    });
    this.closeDeleteFormModal();
    this.triggerSaveToast();
  }

  protected openAddFormModal(): void {
    this.closeDeleteFormModal();
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

    const selectedFormType = this.selectedFormTypeInput();
    const inspectionId = this.inspection().inspectionId;

    this.inspectionStore.createInspectionForm({
      inspectionId,
      formType: selectedFormType,
    });

    this.closeAddFormModal();
    this.triggerSaveToast();
  }

  protected formatFormAppointmentDate(dateTime: string): string {
    const parsedDate = new Date(dateTime);

    if (Number.isNaN(parsedDate.getTime())) {
      return dateTime || 'N/A';
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
    this.isShowingAppointmentSlots.set(false);
    this.selectedAppointmentSlotForDetails.set(null);
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
    this.isShowingAppointmentSlots.set(false);
    this.selectedAppointmentSlotForDetails.set(null);
    this.isAppointmentModalOpen.set(true);
  }

  protected closeAppointmentModal(): void {
    this.isAppointmentModalOpen.set(false);
    this.appointmentValidationMessage.set('');
    this.activeAppointmentIndex.set(null);
    this.isShowingAppointmentSlots.set(false);
    this.selectedAppointmentSlotForDetails.set(null);
  }

  protected toggleShowAppointmentSlots(): void {
    this.isShowingAppointmentSlots.update((value) => !value);
  }

  protected selectAppointmentSlotForDetails(slot: AppointmentSlot): void {
    this.selectedAppointmentSlotForDetails.set(slot);
    this.appointmentDateTimeInput.set(slot.time);
    this.appointmentLocationInput.set(slot.location);
    this.isShowingAppointmentSlots.set(false);
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

  protected updateSummaryInspectionStatus(event: Event): void {
    this.updateSummaryForm({
      inspectionStatus: (event.target as HTMLSelectElement).value as
        | SelectableInspectionStatus
        | '',
    });
  }

  protected updateSummaryInspectionResult(event: Event): void {
    this.updateSummaryForm({
      inspectionResult: (event.target as HTMLSelectElement).value as InspectionReasonOption | '',
    });
  }

  protected updateSummaryCompletionDate(event: Event): void {
    this.updateSummaryForm({
      completionDate: (event.target as HTMLInputElement).value,
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

  protected updateAppointmentLocation(location: string | null): void {
    this.appointmentLocationInput.set(location ?? '');
  }

  protected updateAppointmentComments(event: Event): void {
    this.appointmentCommentsInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected updateAppointmentStatus(status: AppointmentStatus): void {
    this.appointmentStatusInput.set(status);
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

    if (this.appointmentStatusInput() === 'Scheduled' && parsedDateTime <= Date.now()) {
      this.appointmentValidationMessage.set(
        'Scheduled appointments must have a future Appointment Date/Time.',
      );
      return;
    }

    if (this.appointmentCommentsInput().trim().length > 500) {
      this.appointmentValidationMessage.set('Comments must be 500 characters or fewer.');
      return;
    }

    this.appointmentValidationMessage.set('');

    const nextAppointment: AppointmentRow = {
      dateTime,
      location: this.appointmentLocationInput().trim(),
      comments: this.appointmentCommentsInput().trim(),
      status: this.appointmentStatusInput(),
    };

    const inspectionId = this.inspection().inspectionId;

    if (this.appointmentModalMode() === 'create') {
      const nextAppointments = [nextAppointment, ...this.appointmentRows()];
      this.updateCurrentAppointments(() => nextAppointments);
      this.inspectionStore.appendAppointmentAuditEntry(inspectionId, {
        inspectionId,
        action: 'create',
        timestampIso: new Date().toISOString(),
        before: null,
        after: this.toStoredAppointmentRow(nextAppointment),
      });
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

    const currentAppointments = this.appointmentRows();
    const previousAppointment = currentAppointments[activeIndex] ?? null;
    const nextAppointments = currentAppointments.map((appointment, index) =>
      index === activeIndex ? nextAppointment : appointment,
    );

    this.updateCurrentAppointments(() => nextAppointments);
    this.inspectionStore.appendAppointmentAuditEntry(inspectionId, {
      inspectionId,
      action: 'edit',
      timestampIso: new Date().toISOString(),
      before: previousAppointment ? this.toStoredAppointmentRow(previousAppointment) : null,
      after: this.toStoredAppointmentRow(nextAppointment),
    });
    this.showAppointmentCreatedToast.set(true);

    if (this.appointmentToastTimeoutId !== null) {
      clearTimeout(this.appointmentToastTimeoutId);
    }

    this.appointmentToastTimeoutId = setTimeout(() => {
      this.showAppointmentCreatedToast.set(false);
      this.appointmentToastTimeoutId = null;
    }, 3000);

    this.closeAppointmentModal();
  }

  protected formatAppointmentDateTime(dateTime: string): string {
    const parsed = new Date(dateTime);

    if (Number.isNaN(parsed.getTime())) {
      return dateTime || 'N/A';
    }

    const date = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
      .format(parsed)
      .replace(/\//g, '-');
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(parsed);

    return `${date} ${time}`;
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

    if (this.isDeleteFormModalOpen()) {
      this.closeDeleteFormModal();
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
    const nextAppointments = updater([...currentAppointments]);

    this.appointmentRowsByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: nextAppointments,
    }));

    this.inspectionStore.saveAppointmentRows(
      inspectionId,
      nextAppointments.map((appointment) => this.toStoredAppointmentRow(appointment)),
    );
  }

  private getDefaultAppointmentStatus(): AppointmentStatus {
    const currentStatus = this.currentInspectionStatus();

    if (currentStatus === 'Canceled') {
      return 'Cancelled';
    }

    if (
      currentStatus === 'Pending' ||
      currentStatus === 'Scheduled' ||
      currentStatus === 'Planned'
    ) {
      return 'Scheduled';
    }

    return 'Scheduled';
  }

  private toStoredAppointmentRow(row: AppointmentRow): StoredAppointmentRow {
    return {
      dateTime: row.dateTime,
      location: row.location,
      comments: row.comments,
      status: row.status,
    };
  }

  private toAppointmentRow(row: StoredAppointmentRow): AppointmentRow {
    return {
      dateTime: this.toDateTimeInputValue(row.dateTime),
      location: row.location,
      comments: row.comments,
      status: row.status === 'Scheduled' ? 'Scheduled' : 'Cancelled',
    };
  }

  protected toDateTimeInputValue(rawValue: string): string {
    const trimmed = rawValue.trim();

    if (!trimmed) {
      return '';
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    const directParsed = new Date(trimmed);

    if (!Number.isNaN(directParsed.getTime())) {
      const year = directParsed.getFullYear();
      const month = `${directParsed.getMonth() + 1}`.padStart(2, '0');
      const day = `${directParsed.getDate()}`.padStart(2, '0');
      const hour = `${directParsed.getHours()}`.padStart(2, '0');
      const minute = `${directParsed.getMinutes()}`.padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:${minute}`;
    }

    const legacyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i);

    if (!legacyMatch) {
      return '';
    }

    const month = legacyMatch[1];
    const day = legacyMatch[2];
    const year = legacyMatch[3];
    const minute = legacyMatch[5];
    const period = legacyMatch[6].toLowerCase();
    let hour = Number.parseInt(legacyMatch[4], 10);

    if (period === 'pm' && hour < 12) {
      hour += 12;
    }

    if (period === 'am' && hour === 12) {
      hour = 0;
    }

    return `${year}-${month}-${day}T${`${hour}`.padStart(2, '0')}:${minute}`;
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

  private parseSortableTimestamp(dateTime: string): number {
    const parsedDate = Date.parse(dateTime);
    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  }
}
