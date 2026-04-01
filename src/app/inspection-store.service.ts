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
  status: 'Scheduled' | 'Completed' | 'Canceled';
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
  private readonly pendingSuccessToastInspectionIdState = signal<string | null>(null);

  readonly inspections = this.inspectionsState.asReadonly();

  getAppointmentRows(inspectionId: string): StoredAppointmentRow[] | undefined {
    return this.appointmentRowsState()[inspectionId];
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
}
