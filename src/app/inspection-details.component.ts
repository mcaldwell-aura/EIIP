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
import { SelectButtonModule } from 'primeng/selectbutton';
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

type CstimsCriteriaOutcome = 'Pass' | 'Fail' | 'N/A';

type CstimsCriteriaFieldDef = {
  readonly id: string;
  readonly label: string;
};

type CstimsCriteriaSectionDef = {
  readonly id: 'candidate' | 'basic-control-skills' | 'road-test';
  readonly title: string;
  readonly fields: readonly CstimsCriteriaFieldDef[];
};

type CstimsInspectionInformationValue = {
  candidate: string;
  inspector: string;
  inspectionReason: InspectionReasonOption | '';
  inspectionType: InspectionTypeOption | '';
};

type CstimsCriterionSelectOption = {
  label: string;
  value: CstimsCriteriaOutcome;
  icon: string;
};

type CstimsValidationState = {
  summary: string[];
  fieldErrors: Partial<Record<'appointmentDateTime', string>>;
};

type CstimsAppointmentOption = {
  label: string;
  value: string;
};

const CSTIMS_CRITERIA_SECTIONS: readonly CstimsCriteriaSectionDef[] = [
  {
    id: 'candidate',
    title: 'Candidate',
    fields: [
      { id: 'candidate-license-class', label: 'License Class' },
      { id: 'candidate-driving-record', label: 'Driving Record' },
      { id: 'candidate-medical', label: 'Medical' },
      { id: 'candidate-eldt-training', label: 'ELDT Training' },
      { id: 'candidate-test-administration', label: 'Test Administration' },
      { id: 'candidate-test-results', label: 'Test Results' },
      { id: 'candidate-forms-completion', label: 'Forms Completion' },
      { id: 'candidate-qualifications', label: 'Qualifications' },
      { id: 'candidate-documentation', label: 'Documentation' },
      { id: 'candidate-vision-check', label: 'Vision Check' },
      { id: 'candidate-cdlis', label: 'CDLIS' },
      { id: 'candidate-pdps', label: 'PDPS' },
      { id: 'candidate-site', label: 'Site (clearance, noise)' },
      { id: 'candidate-instructions', label: 'Instructions' },
      { id: 'candidate-safety', label: 'Safety' },
      { id: 'candidate-supplies', label: 'Supplies' },
      { id: 'candidate-positioning-observation', label: 'Positioning / Observation' },
      { id: 'candidate-items-inspected', label: 'Appropriate Items Inspected' },
      { id: 'candidate-test-randomization', label: 'Test Randomization' },
      { id: 'candidate-scoring', label: 'Scoring' },
    ],
  },
  {
    id: 'basic-control-skills',
    title: 'Basic Control Skills',
    fields: [
      {
        id: 'basic-control-skills-appropriate-maneuvers',
        label: 'Appropriate Maneuvers Accomplished',
      },
      { id: 'basic-control-skills-positioning-observation', label: 'Positioning / Observation' },
      { id: 'basic-control-skills-scoring', label: 'Scoring' },
    ],
  },
  {
    id: 'road-test',
    title: 'Road Test',
    fields: [
      { id: 'road-test-instructions', label: 'Instructions' },
      { id: 'road-test-appropriate-maneuvers', label: 'Appropriate Maneuvers Accomplished' },
      { id: 'road-test-scoring', label: 'Scoring' },
    ],
  },
];

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
  fileSize: number;
  comment?: string;
};

type UploadedFile = {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  isValid: boolean;
  errorMessage?: string;
  comment: string;
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
  inspectionStatusReason: string;
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
    SelectButtonModule,
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
  protected readonly notesWrapText = signal(false);
  protected readonly noteSortColumn = signal<'name' | 'updatedDate' | 'updatedBy'>('updatedDate');
  protected readonly noteSortDirection = signal<'asc' | 'desc'>('desc');
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
  private readonly lastEditedByInspection = signal<Record<string, string>>({});
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
      inspectionStatusReason: '',
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
  protected readonly lastEditedTimestamp = computed<string>(() => {
    const timestamp = this.lastEditedByInspection()[this.inspection().inspectionId];
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}`;
  });
  protected readonly aiSummaryTimestamp = computed(() => this.lastEditedTimestamp());
  protected readonly aiSummaryText = computed(() => {
    const inspection = this.inspection();
    const form = this.summaryForm();
    const status = form.inspectionStatus || this.currentInspectionStatus();
    const statusReason = form.inspectionStatusReason.trim();
    const statusSentence = statusReason
      ? `Current status is ${status} (${statusReason}).`
      : `Current status is ${status}.`;

    let appointmentSentence = 'Appointment details have not been scheduled yet.';
    if (
      inspection.appointmentDate ||
      inspection.appointmentTime ||
      inspection.appointmentLocation
    ) {
      const dateText = inspection.appointmentDate || 'date to be confirmed';
      const timeText = inspection.appointmentTime ? ` at ${inspection.appointmentTime}` : '';
      const locationText = inspection.appointmentLocation
        ? ` at ${inspection.appointmentLocation}`
        : '';

      appointmentSentence = `Appointment is set for ${dateText}${timeText}${locationText}.`;
    }

    const completionDate = this.formatCompletionDateForSummary(form.completionDate);
    const completionResult = form.inspectionResult;

    let completionSentence = 'Completion information has not been recorded yet.';
    if (completionDate && completionResult) {
      completionSentence = `Completion is recorded for ${completionDate} with a ${completionResult} result.`;
    } else if (completionDate) {
      completionSentence = `Completion is recorded for ${completionDate}.`;
    } else if (completionResult) {
      completionSentence = `Completion result is ${completionResult}, and a completion date has not been recorded yet.`;
    }

    return `${statusSentence} ${appointmentSentence} ${completionSentence}`;
  });
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
    const rows = this.noteRowsByInspection()[this.inspection().inspectionId] ?? this.baseNoteRows();
    const sortColumn = this.noteSortColumn();
    const sortDirection = this.noteSortDirection();

    const sorted = [...rows].sort((a, b) => {
      let aValue: string;
      let bValue: string;

      if (sortColumn === 'name') {
        aValue = a.name;
        bValue = b.name;
      } else if (sortColumn === 'updatedBy') {
        aValue = a.updatedBy;
        bValue = b.updatedBy;
      } else {
        // updatedDate
        aValue = a.updatedDate;
        bValue = b.updatedDate;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  });
  protected readonly baseDocumentRows = computed<DocumentRow[]>(() => {
    if (this.inspection().inspectionId === '892749') {
      return [
        {
          name: 'Vehicle Inspection',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
          fileSize: 2500000,
        },
        {
          name: 'CDL Skills Test',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
          fileSize: 1800000,
        },
        {
          name: 'Road Test',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
          fileSize: 3200000,
        },
        {
          name: 'Vehicle Inspection',
          fileName: 'Examiner Manual §3.2.1',
          updatedDate: '05-13-2026',
          fileSize: 2100000,
        },
      ];
    }

    return this.inspection().documents.map((document) => ({
      name: this.inspection().inspectionReason,
      fileName: document,
      updatedDate: this.inspection().appointmentDate,
      fileSize: 0,
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
  private readonly pendingNewForm = signal<InspectionFormRecord | null>(null);
  protected readonly pendingDeleteFormId = signal<string | null>(null);
  protected readonly cstimsShowValidation = signal(false);
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
    'CSTIMS',
  ];
  protected readonly cstimsCriteriaSections = CSTIMS_CRITERIA_SECTIONS;
  protected readonly cstimsCriteriaSelectOptions: CstimsCriterionSelectOption[] = [
    { label: 'Pass', value: 'Pass', icon: 'pi pi-check' },
    { label: 'Fail', value: 'Fail', icon: 'pi pi-times' },
    { label: 'N/A', value: 'N/A', icon: 'pi pi-minus' },
  ];
  protected readonly noteNameInput = signal('');
  protected readonly noteDescriptionInput = signal('');
  protected readonly documentNameInput = signal('');
  protected readonly documentFileNameInput = signal('');
  protected readonly documentUploadName = signal('');
  protected readonly documentCommentInput = signal('');

  // File upload constants
  protected readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  protected readonly MAX_FILES = 5;
  protected readonly ALLOWED_FILE_TYPES = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx', 'zip'];

  // File upload signals
  protected readonly selectedFiles = signal<UploadedFile[]>([]);

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
  protected readonly noteSubmitLabel = computed(() => 'Save');
  protected readonly pendingDeleteNote = computed(() => {
    const activeIndex = this.activeNoteIndex();

    if (activeIndex === null) {
      return null;
    }

    return this.noteRows()[activeIndex] ?? null;
  });
  protected readonly canSaveDocument = computed(
    () => this.selectedFiles().length > 0 && this.selectedFiles().every((f) => f.isValid),
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

    const pending = this.pendingNewForm();
    if (pending && pending.formId === formId) {
      return pending;
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
  private readonly lastEditedByFormId = signal<Record<string, string>>({});
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
  protected readonly isCstimsActiveForm = computed(() => this.activeForm()?.formType === 'CSTIMS');

  private readonly cstimsInspectionInfoByFormId = signal<
    Record<string, CstimsInspectionInformationValue>
  >({});
  private readonly cstimsCriteriaByFormId = signal<
    Record<string, Record<string, CstimsCriteriaOutcome>>
  >({});

  protected readonly cstimsInspectionInformation = computed<CstimsInspectionInformationValue>(
    () => {
      const form = this.activeForm();

      if (!form || form.formType !== 'CSTIMS') {
        return {
          candidate: '',
          inspector: '',
          inspectionReason: '',
          inspectionType: '',
        };
      }

      const saved = this.cstimsInspectionInfoByFormId()[form.formId];

      return saved ?? this.createDefaultCstimsInspectionInformation(form);
    },
  );

  protected readonly cstimsValidationState = computed<CstimsValidationState>(() => {
    if (!this.isCstimsActiveForm()) {
      return {
        summary: [],
        fieldErrors: {},
      };
    }

    return this.validateCstimsForm(this.formDraft());
  });
  protected readonly cstimsAppointmentOptions = computed<CstimsAppointmentOption[]>(() => {
    const optionByDateTime = new Map<string, CstimsAppointmentOption>();

    for (const row of this.appointmentRows()) {
      optionByDateTime.set(row.dateTime, {
        label: this.formatAppointmentDateTime(row.dateTime),
        value: row.dateTime,
      });
    }

    const mockAppointmentDateTimes = ['2026-09-05T14:15', '2026-08-29T10:30', '2026-08-14T08:45'];

    for (const dateTime of mockAppointmentDateTimes) {
      if (!optionByDateTime.has(dateTime)) {
        optionByDateTime.set(dateTime, {
          label: this.formatAppointmentDateTime(dateTime),
          value: dateTime,
        });
      }
    }

    return [...optionByDateTime.values()].sort(
      (leftOption, rightOption) =>
        this.parseSortableTimestamp(rightOption.value) -
        this.parseSortableTimestamp(leftOption.value),
    );
  });
  protected readonly isCstimsSingleAppointment = computed(
    () => this.cstimsAppointmentOptions().length === 1,
  );
  protected readonly activeFormFieldValues = computed<Record<string, string>>(() => {
    const formId = this.activeFormId();
    if (!formId) return {};
    return this.formFieldValuesByFormId()[formId] ?? {};
  });

  protected getFormFieldValue(fieldId: string): string {
    return this.activeFormFieldValues()[fieldId] ?? '';
  }

  protected getCstimsCriteriaValue(fieldId: string): CstimsCriteriaOutcome {
    const formId = this.activeFormId();

    if (!formId) {
      return 'N/A';
    }

    return this.cstimsCriteriaByFormId()[formId]?.[fieldId] ?? 'N/A';
  }

  protected updateCstimsInspectionInformationField(
    field: keyof CstimsInspectionInformationValue,
    value: string,
  ): void {
    const formId = this.activeFormId();

    if (!formId) {
      return;
    }

    this.cstimsInspectionInfoByFormId.update((existing) => ({
      ...existing,
      [formId]: {
        ...this.cstimsInspectionInformation(),
        [field]: value,
      },
    }));
  }

  protected updateCstimsCriteriaField(fieldId: string, value: CstimsCriteriaOutcome): void {
    const formId = this.activeFormId();

    if (!formId) {
      return;
    }

    this.cstimsCriteriaByFormId.update((existing) => ({
      ...existing,
      [formId]: {
        ...(existing[formId] ?? this.createDefaultCstimsCriteriaValues()),
        [fieldId]: value,
      },
    }));
  }

  protected passAllCstimsCriteria(): void {
    const formId = this.activeFormId();

    if (!formId) {
      return;
    }

    const passAllValues: Record<string, CstimsCriteriaOutcome> = {};

    for (const section of CSTIMS_CRITERIA_SECTIONS) {
      for (const field of section.fields) {
        passAllValues[field.id] = 'Pass';
      }
    }

    this.cstimsCriteriaByFormId.update((existing) => ({
      ...existing,
      [formId]: passAllValues,
    }));
  }
  private readonly autoSelectSingleCstimsAppointmentEffect = effect(() => {
    if (!this.isCstimsActiveForm()) {
      return;
    }

    const draft = this.formDraft();
    if (!draft) {
      return;
    }

    const options = this.cstimsAppointmentOptions();
    if (options.length !== 1) {
      return;
    }

    const singleAppointment = options[0];
    if (draft.appointmentDateTime !== singleAppointment.value) {
      this.updateFormDraftField('appointmentDateTime', singleAppointment.value);
    }
  });
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

    // Initialize last edited timestamps for all existing forms
    const inspectionId = this.inspection().inspectionId;
    const forms = this.inspectionStore.getInspectionForms(inspectionId);
    const lastEditedData: Record<string, string> = {};
    forms.forEach((form) => {
      lastEditedData[form.formId] = new Date().toISOString();
    });
    this.lastEditedByFormId.set(lastEditedData);
  }

  protected selectTab(tab: DetailsTab): void {
    this.activeTab.set(tab);
  }

  protected openFormModal(form: InspectionFormRecord): void {
    this.closeDeleteFormModal();
    this.activeFormId.set(form.formId);
    this.cstimsShowValidation.set(false);
    this.formDraft.set({
      appointmentDateTime: this.toDateTimeInputValue(form.appointmentDateTime),
      inspector: form.inspector,
      status: form.status,
      comments: form.comments,
    });

    if (form.formType === 'CSTIMS') {
      this.ensureCstimsFormState(form);
    }

    const sections = FORM_CONTENT_DEFS[form.formType];
    this.activeFormSectionId.set(sections?.[0]?.id ?? '');
    this.isFormModalOpen.set(true);
  }

  protected closeFormModal(): void {
    if (this.pendingNewForm() && this.activeFormId() === this.pendingNewForm()!.formId) {
      this.pendingNewForm.set(null);
    }
    this.isFormModalOpen.set(false);
    this.activeFormId.set(null);
    this.formDraft.set(null);
    this.activeFormSectionId.set('');
    this.cstimsShowValidation.set(false);
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
    const pendingNew = this.pendingNewForm();
    const isSavingPendingNew = !!pendingNew && pendingNew.formId === form?.formId;

    if (!inspectionId || !form || !draft) {
      return;
    }

    if (form.formType === 'CSTIMS') {
      this.cstimsShowValidation.set(true);
      const validation = this.validateCstimsForm(draft);

      if (validation.summary.length > 0) {
        return;
      }
    }

    let persistedFormId = form.formId;

    if (isSavingPendingNew) {
      const created = this.inspectionStore.createInspectionForm({
        inspectionId,
        formType: form.formType,
        appointmentDateTime: draft.appointmentDateTime,
        inspector: draft.inspector.trim() || 'Unassigned',
        status: draft.status,
        comments: draft.comments.trim(),
      });

      persistedFormId = created.formId;
      const pendingFormId = pendingNew.formId;

      this.lastEditedByFormId.update((existing) => {
        const next = { ...existing, [created.formId]: new Date().toISOString() };
        delete next[pendingFormId];
        return next;
      });

      this.formFieldValuesByFormId.update((existing) => {
        const pendingValues = existing[pendingFormId];

        if (!pendingValues) {
          return existing;
        }

        const next = {
          ...existing,
          [created.formId]: { ...pendingValues },
        };
        delete next[pendingFormId];
        return next;
      });

      this.cstimsInspectionInfoByFormId.update((existing) => {
        const pendingValues = existing[pendingFormId];

        if (!pendingValues) {
          return existing;
        }

        const next = {
          ...existing,
          [created.formId]: { ...pendingValues },
        };
        delete next[pendingFormId];
        return next;
      });

      this.cstimsCriteriaByFormId.update((existing) => {
        const pendingValues = existing[pendingFormId];

        if (!pendingValues) {
          return existing;
        }

        const next = {
          ...existing,
          [created.formId]: { ...pendingValues },
        };
        delete next[pendingFormId];
        return next;
      });

      this.pendingNewForm.set(null);
      this.activeFormId.set(created.formId);
    }

    if (!isSavingPendingNew) {
      this.inspectionStore.updateInspectionForm({
        inspectionId,
        formId: persistedFormId,
        changes: {
          appointmentDateTime: draft.appointmentDateTime,
          inspector: draft.inspector.trim() || 'Unassigned',
          status: draft.status,
          comments: draft.comments.trim(),
        },
      });

      this.lastEditedByFormId.update((existing) => ({
        ...existing,
        [persistedFormId]: new Date().toISOString(),
      }));
    }

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

    const pendingFormId = `new-${Date.now()}`;
    const inspection = this.inspection();
    const pendingForm: InspectionFormRecord = {
      formId: pendingFormId,
      inspectionId,
      formType: selectedFormType,
      appointmentDateTime: this.toDateTimeInputValue(new Date().toISOString()),
      inspector: inspection.assignedInspector?.trim() || 'Unassigned',
      status: 'Scheduled',
      comments: '',
    };

    this.pendingNewForm.set(pendingForm);

    this.closeAddFormModal();
    this.openFormModal(pendingForm);
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

  protected getFormLastEditedTimestamp(formId: string): string {
    const timestamp = this.lastEditedByFormId()[formId];
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return `Last Edited: ${month}/${day}/${year} ${hoursStr}:${minutes} ${ampm}`;
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

  protected updateSummaryInspectionStatusReason(event: Event): void {
    this.updateSummaryForm({
      inspectionStatusReason: (event.target as HTMLInputElement).value.trim(),
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

    this.lastEditedByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: new Date().toISOString(),
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

  protected toggleNotesWrapText(): void {
    this.notesWrapText.set(!this.notesWrapText());
  }

  protected sortNotesByColumn(column: 'name' | 'updatedDate' | 'updatedBy'): void {
    if (this.noteSortColumn() === column) {
      // Toggle direction if same column clicked
      this.noteSortDirection.set(this.noteSortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to descending for date, ascending for others
      this.noteSortColumn.set(column);
      this.noteSortDirection.set(column === 'updatedDate' ? 'desc' : 'asc');
    }
  }

  protected getNoteSortIndicator(column: 'name' | 'updatedDate' | 'updatedBy'): string {
    if (this.noteSortColumn() !== column) return '▼';
    return this.noteSortDirection() === 'asc' ? '▲' : '▼';
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
    this.noteNameInput.set((event.target as HTMLInputElement).value);
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
    this.selectedFiles.set([]);
    this.documentCommentInput.set('');
    this.isDocumentModalOpen.set(true);
  }

  protected closeDocumentModal(): void {
    this.isDocumentModalOpen.set(false);
    this.documentModalMode.set('add');
    this.activeDocumentIndex.set(null);
    this.selectedFiles.set([]);
    this.documentCommentInput.set('');
  }

  protected openEditDocumentModal(document: DocumentRow, index: number): void {
    this.closeAppointmentModal();
    this.closeAssignInspectorModal();
    this.closeNoteModal();
    this.closeDeleteNoteModal();
    this.closeDeleteDocumentModal();
    this.documentModalMode.set('edit');
    this.activeDocumentIndex.set(index);
    this.selectedFiles.set([
      {
        id: `file-${index}`,
        file: new File([], document.fileName),
        fileName: document.fileName,
        fileSize: this.formatFileSize(document.fileSize),
        isValid: true,
        comment: document.comment ?? '',
      },
    ]);
    this.documentCommentInput.set(document.comment ?? '');
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

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) {
      return '';
    }
    return fileName.substring(lastDot + 1).toLowerCase();
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private validateFile(file: File): { isValid: boolean; errorMessage?: string } {
    const extension = this.getFileExtension(file.name);

    // Check file type
    if (!this.ALLOWED_FILE_TYPES.includes(extension)) {
      return {
        isValid: false,
        errorMessage: `File type .${extension} is not allowed. Allowed types: ${this.ALLOWED_FILE_TYPES.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        errorMessage: `File size exceeds 50MB limit. File size: ${this.formatFileSize(file.size)}`,
      };
    }

    return { isValid: true };
  }

  protected updateDocumentUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      return;
    }

    const currentFiles = this.selectedFiles();

    // Check if adding these files would exceed max files
    if (currentFiles.length + files.length > this.MAX_FILES) {
      // Toast error: max files exceeded
      console.warn(
        `Cannot add ${files.length} files. Maximum ${this.MAX_FILES} files allowed. Currently have ${currentFiles.length} files.`,
      );
      return;
    }

    // Process each file
    const newFiles: UploadedFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = this.validateFile(file);

      const uploadedFile: UploadedFile = {
        id: `file-${Date.now()}-${i}`,
        file: file,
        fileName: file.name,
        fileSize: this.formatFileSize(file.size),
        isValid: validation.isValid,
        errorMessage: validation.errorMessage,
        comment: '',
      };

      newFiles.push(uploadedFile);
    }

    // Add valid files to the selected files array
    this.selectedFiles.set([...currentFiles, ...newFiles.filter((f) => f.isValid)]);

    // Log any invalid files for toasting
    const invalidFiles = newFiles.filter((f) => !f.isValid);
    if (invalidFiles.length > 0) {
      invalidFiles.forEach((file) => {
        console.warn(`File validation error: ${file.fileName} - ${file.errorMessage}`);
        // TODO: Show toast error for each invalid file
      });
    }

    // Reset the input
    input.value = '';
  }

  protected removeUploadedFile(fileId: string): void {
    this.selectedFiles.set(this.selectedFiles().filter((f) => f.id !== fileId));
  }

  protected updateFileComment(fileId: string, comment: string): void {
    this.selectedFiles.update((files) =>
      files.map((f) => (f.id === fileId ? { ...f, comment } : f)),
    );
  }

  protected updateDocumentComment(event: Event): void {
    this.documentCommentInput.set((event.target as HTMLTextAreaElement).value);
  }

  protected saveDocument(): void {
    if (!this.canSaveDocument()) {
      return;
    }

    const filesToSave = this.selectedFiles().filter((f) => f.isValid);

    filesToSave.forEach((uploadedFile) => {
      const nextDocument: DocumentRow = {
        name: uploadedFile.fileName,
        fileName: uploadedFile.fileName,
        fileSize: uploadedFile.file.size,
        updatedDate: this.formatToday(),
        comment: uploadedFile.comment.trim(),
      };

      this.updateCurrentDocuments((documents) => [nextDocument, ...documents]);
    });

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

  private ensureCstimsFormState(form: InspectionFormRecord): void {
    this.cstimsInspectionInfoByFormId.update((existing) => {
      if (existing[form.formId]) {
        return existing;
      }

      return {
        ...existing,
        [form.formId]: this.createDefaultCstimsInspectionInformation(form),
      };
    });

    this.cstimsCriteriaByFormId.update((existing) => {
      if (existing[form.formId]) {
        return existing;
      }

      return {
        ...existing,
        [form.formId]: this.createDefaultCstimsCriteriaValues(),
      };
    });
  }

  private createDefaultCstimsInspectionInformation(
    form: InspectionFormRecord,
  ): CstimsInspectionInformationValue {
    const inspection = this.inspection();
    const inspector = form.inspector === 'Unassigned' ? '' : form.inspector;
    const inspectionReason = this.inspectionReasonOptions.includes(
      inspection.inspectionReason as InspectionReasonOption,
    )
      ? (inspection.inspectionReason as InspectionReasonOption)
      : '';
    const inspectionType = this.inspectionTypeOptions.includes(
      inspection.inspectionType as InspectionTypeOption,
    )
      ? (inspection.inspectionType as InspectionTypeOption)
      : '';

    return {
      candidate: inspection.subjectName,
      inspector,
      inspectionReason,
      inspectionType,
    };
  }

  private createDefaultCstimsCriteriaValues(): Record<string, CstimsCriteriaOutcome> {
    return Object.fromEntries(
      CSTIMS_CRITERIA_SECTIONS.flatMap((section) =>
        section.fields.map((field) => [field.id, 'N/A' satisfies CstimsCriteriaOutcome]),
      ),
    );
  }

  private validateCstimsForm(
    draft: {
      appointmentDateTime: string;
      inspector: string;
      status: InspectionFormStatus;
      comments: string;
    } | null,
  ): CstimsValidationState {
    const summary: string[] = [];
    const fieldErrors: CstimsValidationState['fieldErrors'] = {};

    const appointmentDateTime = draft?.appointmentDateTime.trim() ?? '';

    if (!appointmentDateTime) {
      fieldErrors.appointmentDateTime = 'Appointment date is required.';
      summary.push('Appointment date is required.');
    } else {
      const parsedDateTime = Date.parse(appointmentDateTime);

      if (Number.isNaN(parsedDateTime)) {
        fieldErrors.appointmentDateTime = 'Appointment date must be valid.';
        summary.push('Appointment date must be valid.');
      }
    }

    return {
      summary,
      fieldErrors,
    };
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

    this.lastEditedByInspection.update((existing) => ({
      ...existing,
      [inspectionId]: new Date().toISOString(),
    }));
  }

  private formatCompletionDateForSummary(value: string): string {
    if (!value) {
      return '';
    }

    const [yearText = '', monthText = '', dayText = ''] = value.split('-');
    if (yearText.length !== 4 || monthText.length !== 2 || dayText.length !== 2) {
      return value;
    }

    return `${monthText}/${dayText}/${yearText}`;
  }

  private parseSortableTimestamp(dateTime: string): number {
    const parsedDate = Date.parse(dateTime);
    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  }
}
