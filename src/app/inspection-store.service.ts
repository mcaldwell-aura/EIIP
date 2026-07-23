import { Injectable, signal } from '@angular/core';
import {
  INSPECTIONS,
  type InspectionRecord,
  type InspectionStatus,
  type InspectionType,
} from './inspection-data';

export type StoredAppointmentRow = {
  dateTime: string;
  location: string;
  comments: string;
  status: 'Scheduled' | 'Cancelled' | 'Completed' | 'Canceled';
};

export type InspectionFormStatus = 'Scheduled' | 'In Progress' | 'Completed' | 'Overdue';

export type InspectionFormRecord = {
  formId: string;
  inspectionId: string;
  formType: string;
  appointmentDateTime: string;
  inspector: string;
  status: InspectionFormStatus;
  comments: string;
};

export type CreateInspectionFormInput = {
  inspectionId: string;
  formType: string;
  formId?: string;
  appointmentDateTime?: string;
  inspector?: string;
  status?: InspectionFormStatus;
  comments?: string;
};

export type UpdateInspectionFormInput = {
  inspectionId: string;
  formId: string;
  changes: Partial<
    Pick<InspectionFormRecord, 'appointmentDateTime' | 'inspector' | 'status' | 'comments'>
  >;
};

export type DeleteInspectionFormInput = {
  inspectionId: string;
  formId: string;
};

export type UpdateInspectionDetailsInput = {
  inspectionId: string;
  changes: Partial<Pick<InspectionRecord, 'inspectionReason' | 'inspectionType'>>;
};

type AppointmentAuditAction = 'create' | 'edit';

export type AppointmentAuditEntry = {
  inspectionId: string;
  action: AppointmentAuditAction;
  timestampIso: string;
  before: StoredAppointmentRow | null;
  after: StoredAppointmentRow;
};

export type CreateInspectionInput = {
  subjectId: string;
  subjectName: string;
  nextDue: string;
  priority: number;
  inspectionReason: string;
  inspectionType: InspectionType;
  assignedInspectors: string[];
  appointments: Array<{
    dateTime: string;
    location: string;
  }>;
};

@Injectable({ providedIn: 'root' })
export class InspectionStoreService {
  private readonly inspectionsState = signal<InspectionRecord[]>([...INSPECTIONS]);
  private readonly appointmentRowsState = signal<Record<string, StoredAppointmentRow[]>>({});
  private readonly inspectionFormsState = signal<Record<string, InspectionFormRecord[]>>({
    '892749': [
      {
        formId: '5202',
        inspectionId: '892749',
        formType: 'Evidence Checklist',
        appointmentDateTime: '2026-05-03T09:30',
        inspector: 'Monique Hale',
        status: 'In Progress',
        comments: 'Initial review in progress.',
      },
      {
        formId: '5198',
        inspectionId: '892749',
        formType: 'Overt Observation Form',
        appointmentDateTime: '2026-04-27T11:00',
        inspector: 'Monique Hale',
        status: 'Completed',
        comments: 'Completed and submitted.',
      },
    ],
    '892751': [
      {
        formId: '5206',
        inspectionId: '892751',
        formType: 'Evidence Checklist',
        appointmentDateTime: '2026-04-19T09:00',
        inspector: 'Unassigned',
        status: 'Scheduled',
        comments: 'Awaiting final inspector assignment.',
      },
    ],
    '892772': [
      {
        formId: '5210',
        inspectionId: '892772',
        formType: 'Overt Observation Form',
        appointmentDateTime: '2026-03-30T10:30',
        inspector: 'Monique Hale',
        status: 'Completed',
        comments: 'Observation completed and added to closeout packet.',
      },
      {
        formId: '5211',
        inspectionId: '892772',
        formType: 'Covert Observation Form',
        appointmentDateTime: '2026-03-29T15:15',
        inspector: 'Monique Hale',
        status: 'Completed',
        comments: 'Supporting covert observation completed prior to review.',
      },
    ],
    '892802': [
      {
        formId: '5214',
        inspectionId: '892802',
        formType: 'Covert Observation Form',
        appointmentDateTime: '2026-04-07T14:00',
        inspector: 'Monique Hale',
        status: 'In Progress',
        comments: 'Field notes captured; pending final comments.',
      },
    ],
    '892756': [
      {
        formId: '5220',
        inspectionId: '892756',
        formType: 'Evidence Checklist',
        appointmentDateTime: '2026-04-22T14:15',
        inspector: 'Jordan Alvarez',
        status: 'In Progress',
        comments:
          'Initial review in progress. Follow-up findings from prior quarter require full documentation.',
      },
      {
        formId: '5219',
        inspectionId: '892756',
        formType: 'Overt Observation Form',
        appointmentDateTime: '2026-04-21T10:00',
        inspector: 'Jordan Alvarez',
        status: 'Completed',
        comments:
          'Overt observation completed. Subject compliant throughout the observation period.',
      },
    ],
  });
  // Backend/system-side audit trail; intentionally not exposed to UI.
  private readonly appointmentAuditTrailState = signal<Record<string, AppointmentAuditEntry[]>>({});
  private readonly pendingSuccessToastInspectionIdState = signal<string | null>(null);

  readonly inspections = this.inspectionsState.asReadonly();

  getAppointmentRows(inspectionId: string): StoredAppointmentRow[] | undefined {
    return this.appointmentRowsState()[inspectionId];
  }

  getInspectionForms(inspectionId: string): InspectionFormRecord[] {
    return this.inspectionFormsState()[inspectionId] ?? [];
  }

  getInspectionFormById(inspectionId: string, formId: string): InspectionFormRecord | null {
    return this.getInspectionForms(inspectionId).find((form) => form.formId === formId) ?? null;
  }

  previewNextInspectionFormId(): string {
    return `${this.getNextInspectionFormId()}`;
  }

  createInspectionForm(input: CreateInspectionFormInput): InspectionFormRecord {
    const inspection = this.inspectionsState().find(
      (candidate) => candidate.inspectionId === input.inspectionId,
    );
    const now = new Date();
    const normalizedFormId = input.formId?.trim();

    const created: InspectionFormRecord = {
      formId:
        normalizedFormId && normalizedFormId.length > 0
          ? normalizedFormId
          : `${this.getNextInspectionFormId()}`,
      inspectionId: input.inspectionId,
      formType: input.formType,
      appointmentDateTime: input.appointmentDateTime ?? this.toDateTimeInputValue(now),
      inspector: input.inspector ?? inspection?.assignedInspector ?? 'Unassigned',
      status: input.status ?? 'Scheduled',
      comments: input.comments ?? '',
    };

    this.inspectionFormsState.update((existing) => ({
      ...existing,
      [input.inspectionId]: [created, ...(existing[input.inspectionId] ?? [])],
    }));

    return created;
  }

  updateInspectionForm(input: UpdateInspectionFormInput): void {
    this.inspectionFormsState.update((existing) => {
      const currentRows = existing[input.inspectionId] ?? [];

      return {
        ...existing,
        [input.inspectionId]: currentRows.map((form) =>
          form.formId === input.formId
            ? {
                ...form,
                ...input.changes,
              }
            : form,
        ),
      };
    });
  }

  deleteInspectionForm(input: DeleteInspectionFormInput): void {
    this.inspectionFormsState.update((existing) => {
      const currentRows = existing[input.inspectionId] ?? [];

      return {
        ...existing,
        [input.inspectionId]: currentRows.filter((form) => form.formId !== input.formId),
      };
    });
  }

  updateInspectionDetails(input: UpdateInspectionDetailsInput): void {
    this.inspectionsState.update((existingRows) =>
      existingRows.map((row) => {
        if (row.inspectionId !== input.inspectionId) {
          return row;
        }

        return {
          ...row,
          ...input.changes,
        };
      }),
    );
  }

  saveAppointmentRows(inspectionId: string, rows: StoredAppointmentRow[]): void {
    this.appointmentRowsState.update((existing) => ({
      ...existing,
      [inspectionId]: rows,
    }));
  }

  appendAppointmentAuditEntry(inspectionId: string, entry: AppointmentAuditEntry): void {
    this.appointmentAuditTrailState.update((existing) => ({
      ...existing,
      [inspectionId]: [...(existing[inspectionId] ?? []), entry],
    }));
  }

  createInspection(input: CreateInspectionInput): string {
    const inspectionId = this.generateInspectionId();
    const appointmentRows = input.appointments.map((appointment) =>
      this.toStoredAppointment(appointment),
    );
    const firstAppointment = input.appointments[0];
    const firstAppointmentParts = firstAppointment?.dateTime
      ? this.toAppointmentParts(firstAppointment.dateTime)
      : null;
    const inspectionStatus: InspectionStatus = appointmentRows.length > 0 ? 'Scheduled' : 'Pending';

    const newInspection: InspectionRecord = {
      inspectionId,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      nextDue: input.nextDue,
      priority: input.priority,
      inspectionReason: input.inspectionReason,
      inspectionStatus,
      inspectionType: input.inspectionType,
      assignedInspector:
        input.assignedInspectors.length > 0 ? input.assignedInspectors.join(', ') : 'Unassigned',
      appointmentDate: firstAppointmentParts?.appointmentDate ?? '',
      appointmentTime: firstAppointmentParts?.appointmentTime ?? '',
      appointmentLocation: firstAppointment?.location ?? '',
      notes: [],
      documents: [],
    };

    this.inspectionsState.update((existing) => [newInspection, ...existing]);

    if (appointmentRows.length > 0) {
      this.appointmentRowsState.update((existing) => ({
        ...existing,
        [inspectionId]: appointmentRows,
      }));
    }

    this.pendingSuccessToastInspectionIdState.set(inspectionId);
    return inspectionId;
  }

  consumeCreatedInspectionToast(inspectionId: string): boolean {
    if (this.pendingSuccessToastInspectionIdState() !== inspectionId) {
      return false;
    }

    this.pendingSuccessToastInspectionIdState.set(null);
    return true;
  }

  private generateInspectionId(): string {
    const highestId = this.inspectionsState().reduce((highest, inspection) => {
      const numericId = Number.parseInt(inspection.inspectionId, 10);
      return Number.isNaN(numericId) ? highest : Math.max(highest, numericId);
    }, 892000);

    return `${highestId + 1}`;
  }

  private toStoredAppointment(appointment: {
    dateTime: string;
    location: string;
  }): StoredAppointmentRow {
    return {
      dateTime: appointment.dateTime ? this.formatAppointmentDisplay(appointment.dateTime) : 'TBD',
      location: appointment.location,
      comments: '',
      status: 'Scheduled',
    };
  }

  private toAppointmentParts(
    dateTime: string,
  ): { appointmentDate: string; appointmentTime: string } | null {
    const parsedDate = new Date(dateTime);

    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const appointmentDate = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
      .format(parsedDate)
      .replace(/\//g, '-');
    const appointmentTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
      .format(parsedDate)
      .replace(' ', '')
      .toLowerCase();

    return {
      appointmentDate,
      appointmentTime,
    };
  }

  private formatAppointmentDisplay(dateTime: string): string {
    const parsedDate = new Date(dateTime);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'TBD';
    }

    const date = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    })
      .format(parsedDate)
      .replace(/\//g, '-');
    const time = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(parsedDate);

    return `${date} ${time}`;
  }

  private toDateTimeInputValue(dateValue: Date): string {
    const year = dateValue.getFullYear();
    const month = `${dateValue.getMonth() + 1}`.padStart(2, '0');
    const day = `${dateValue.getDate()}`.padStart(2, '0');
    const hour = `${dateValue.getHours()}`.padStart(2, '0');
    const minute = `${dateValue.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  private getNextInspectionFormId(): number {
    const maxExistingId = Object.values(this.inspectionFormsState())
      .flat()
      .reduce((maxValue, form) => {
        const numericId = Number.parseInt(form.formId, 10);
        return Number.isNaN(numericId) ? maxValue : Math.max(maxValue, numericId);
      }, 5199);

    return maxExistingId + 1;
  }
}
