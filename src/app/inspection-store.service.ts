import { Injectable, signal } from '@angular/core';
import {
  INSPECTIONS,
  type InspectionRecord,
  type InspectionStatus,
  type InspectionType,
} from './inspection-data';

export type PriorityScoreDetail = {
  candidateId: string;
  candidateName: string;
  score: number;
  plainEnglishSummary: string;
  factors: PriorityScoreFactor[];
  scoreHistory: Array<{ date: string; score: number }>;
};

export type PriorityScoreFactor = {
  name: string;
  candidateValue: string;
  points: number;
  isImpactful: boolean;
  tiers: PriorityScoreFactorTier[];
};

export type PriorityScoreFactorTier = {
  rangeLabel: string;
  points: number;
  isActive: boolean;
};

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

const DEFAULT_PRIORITY_SUMMARY =
  'Prioritized based on due-date urgency, current inspection indicators, and historical risk trend signals.';

const PRIORITY_SUMMARY_BY_CANDIDATE: Record<string, string> = {
  'fred-johnson':
    'Prioritized because the next inspection is due immediately and the assigned reviewer has flagged follow-up risk indicators.',
  'jamie-carter':
    'Prioritized due to immediate due-date pressure and unresolved planning activities that still require assignment and scheduling.',
  'andrea-banks':
    'Prioritized because corrective follow-up remains active and recent findings require prompt verification before closeout.',
  'maria-ellis':
    'Lower urgency because this candidate has no active risk escalations and recent outcomes remain stable.',
  'alec-wright':
    'Lower urgency because current indicators show limited near-term risk despite a pending scheduled review.',
  'riley-clark':
    'Prioritized due to high operational impact and the need to verify sustained compliance after recent elevated activity.',
  'devon-mills':
    'Lower urgency because recent performance indicators are stable and no active deficiency trend is present.',
  'noah-brooks':
    'Prioritized due to an open deficiency signal and the need for rapid follow-up validation.',
  'taylor-owens':
    'Prioritized primarily because a corrective action review is due immediately and the candidate has an open deficiency finding.',
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

  getPriorityScoreDetail(candidateId: string, inspectionId?: string): PriorityScoreDetail | null {
    const inspections = this.inspectionsState();
    const matchedInspection = inspectionId
      ? inspections.find((inspection) => inspection.inspectionId === inspectionId)
      : undefined;
    const subjectInspections = inspections.filter(
      (inspection) => inspection.subjectId === candidateId,
    );
    const inspection =
      matchedInspection ?? this.selectMostRelevantInspection(subjectInspections) ?? null;

    if (!inspection) {
      return null;
    }

    const score = Math.max(0, Math.min(100, Math.round(inspection.priority)));

    return {
      candidateId,
      candidateName: inspection.subjectName,
      score,
      plainEnglishSummary: PRIORITY_SUMMARY_BY_CANDIDATE[candidateId] ?? DEFAULT_PRIORITY_SUMMARY,
      factors: this.buildPriorityScoreFactors(inspection, score),
      scoreHistory: this.buildPriorityScoreHistory(score, candidateId),
    };
  }

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

  private selectMostRelevantInspection(inspections: InspectionRecord[]): InspectionRecord | null {
    if (inspections.length === 0) {
      return null;
    }

    return [...inspections].sort((leftInspection, rightInspection) => {
      const rightDate = this.parseDateToTimestamp(rightInspection.appointmentDate);
      const leftDate = this.parseDateToTimestamp(leftInspection.appointmentDate);
      return rightDate - leftDate;
    })[0];
  }

  private buildPriorityScoreFactors(
    inspection: InspectionRecord,
    score: number,
  ): PriorityScoreFactor[] {
    const daysUntilDue = this.getDaysUntilDue(inspection.nextDue);
    const correctivePending = /corrective|complaint|deficiency/i.test(inspection.inspectionReason);
    const openDeficiency =
      inspection.inspectionStatus === 'Unsatisfactory' ||
      inspection.inspectionStatus === 'Pending' ||
      /deficiency/i.test(inspection.inspectionReason);
    const estimatedPassRate = this.estimatePassRate(inspection.inspectionStatus);

    const dueTier = daysUntilDue <= 13 ? 'urgent' : daysUntilDue <= 180 ? 'soon' : 'later';
    const duePointsByTier = {
      urgent: Math.max(0, Math.round(score * 0.55)),
      soon: Math.max(0, Math.round(score * 0.3)),
      later: Math.max(0, Math.round(score * 0.12)),
    };

    const duePoints =
      dueTier === 'urgent'
        ? duePointsByTier.urgent
        : dueTier === 'soon'
          ? duePointsByTier.soon
          : duePointsByTier.later;
    const correctivePoints = correctivePending ? Math.max(0, Math.round(score * 0.18)) : 0;
    const deficiencyPoints = openDeficiency ? Math.max(0, Math.round(score * 0.12)) : 0;
    const passRatePoints = estimatedPassRate < 80 ? Math.max(0, Math.round(score * 0.1)) : 0;

    const remainingPoints = Math.max(
      0,
      score - (duePoints + correctivePoints + deficiencyPoints + passRatePoints),
    );

    const factors: PriorityScoreFactor[] = [
      {
        name: 'Days until due',
        candidateValue: `${Math.max(daysUntilDue, 0)} days`,
        points: duePoints,
        isImpactful: duePoints > 0,
        tiers: [
          {
            rangeLabel: '0-13 days',
            points: duePointsByTier.urgent,
            isActive: dueTier === 'urgent',
          },
          {
            rangeLabel: '14-180 days',
            points: duePointsByTier.soon,
            isActive: dueTier === 'soon',
          },
          {
            rangeLabel: '181+ days',
            points: duePointsByTier.later,
            isActive: dueTier === 'later',
          },
        ],
      },
      {
        name: 'Corrective action pending',
        candidateValue: correctivePending ? 'Yes' : 'No',
        points: correctivePoints,
        isImpactful: correctivePending,
        tiers: [
          {
            rangeLabel: 'Yes',
            points: Math.max(0, Math.round(score * 0.18)),
            isActive: correctivePending,
          },
          { rangeLabel: 'No', points: 0, isActive: !correctivePending },
        ],
      },
      {
        name: 'Open deficiency finding',
        candidateValue: openDeficiency ? 'Yes' : 'No',
        points: deficiencyPoints,
        isImpactful: openDeficiency,
        tiers: [
          {
            rangeLabel: 'Yes',
            points: Math.max(0, Math.round(score * 0.12)),
            isActive: openDeficiency,
          },
          { rangeLabel: 'No', points: 0, isActive: !openDeficiency },
        ],
      },
      {
        name: 'Estimated pass rate',
        candidateValue: `${estimatedPassRate}%`,
        points: passRatePoints,
        isImpactful: passRatePoints > 0,
        tiers: [
          {
            rangeLabel: '< 80%',
            points: Math.max(0, Math.round(score * 0.1)),
            isActive: estimatedPassRate < 80,
          },
          {
            rangeLabel: '80-89%',
            points: Math.max(0, Math.round(score * 0.04)),
            isActive: estimatedPassRate >= 80 && estimatedPassRate < 90,
          },
          { rangeLabel: '90%+', points: 0, isActive: estimatedPassRate >= 90 },
        ],
      },
    ];

    if (remainingPoints > 0) {
      factors.push({
        name: 'Historical trend weighting',
        candidateValue: 'Applied',
        points: remainingPoints,
        isImpactful: true,
        tiers: [
          { rangeLabel: 'Applied', points: remainingPoints, isActive: true },
          { rangeLabel: 'Not applied', points: 0, isActive: false },
        ],
      });
    }

    return factors;
  }

  private buildPriorityScoreHistory(
    score: number,
    candidateId: string,
  ): Array<{ date: string; score: number }> {
    const weeklyOffsets = [-11, -9, -7, -5, -3, -1, 0];
    const seed = this.createDeterministicSeed(candidateId);
    let randomState = seed;
    const nextRandom = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0;
      return randomState / 4294967296;
    };

    const startDrop = 20 + Math.floor(nextRandom() * 14);
    const historyScores: number[] = [];
    const stepsToCurrent = weeklyOffsets.length - 1;
    let runningScore = Math.max(6, Math.min(94, score - startDrop));
    historyScores.push(runningScore);

    for (let index = 1; index < stepsToCurrent; index += 1) {
      const remainingSteps = stepsToCurrent - index + 1;
      const distanceToFinal = score - runningScore;
      const drift = Math.max(1, Math.round(distanceToFinal / Math.max(1, remainingSteps)));
      const jitter = Math.floor(nextRandom() * 7) - 3;
      let step = drift + jitter;

      if (nextRandom() < 0.28) {
        step -= 2;
      }

      step = Math.max(-5, Math.min(9, step));
      const minScore = Math.max(0, runningScore - 5);
      const maxScore = Math.min(100, runningScore + 9);
      runningScore = Math.max(minScore, Math.min(maxScore, runningScore + step));

      const maxBeforeFinal = Math.min(99, score + 3);
      runningScore = Math.min(runningScore, maxBeforeFinal);
      historyScores.push(runningScore);
    }

    const hasDip = historyScores.some(
      (value, index) => index > 0 && value < historyScores[index - 1],
    );
    if (!hasDip && historyScores.length >= 4) {
      const dipIndex = Math.min(
        historyScores.length - 2,
        2 + Math.floor(nextRandom() * Math.max(1, historyScores.length - 3)),
      );
      const dipAmount = 2 + Math.floor(nextRandom() * 4);
      historyScores[dipIndex] = Math.max(0, historyScores[dipIndex - 1] - dipAmount);

      for (let index = dipIndex + 1; index < historyScores.length; index += 1) {
        const minScore = Math.max(0, historyScores[index - 1] - 3);
        const maxScore = Math.min(99, historyScores[index - 1] + 8, score + 3);
        historyScores[index] = Math.max(minScore, Math.min(maxScore, historyScores[index]));
      }
    }

    historyScores.push(score);

    return weeklyOffsets.map((weekOffset, index) => {
      const date = new Date();
      date.setDate(date.getDate() + weekOffset * 7);

      return {
        date: date.toISOString(),
        score: Math.max(0, Math.min(100, Math.round(historyScores[index] ?? score))),
      };
    });
  }

  private createDeterministicSeed(value: string): number {
    let hash = 2166136261;

    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
  }

  private estimatePassRate(status: InspectionStatus): number {
    const passRateByStatus: Record<InspectionStatus, number> = {
      Scheduled: 84,
      Pending: 76,
      Planned: 82,
      Good: 92,
      Satisfactory: 88,
      Unsatisfactory: 62,
      Canceled: 80,
    };

    return passRateByStatus[status];
  }

  private getDaysUntilDue(nextDue: string): number {
    const dueTimestamp = this.parseDateToTimestamp(nextDue);
    if (dueTimestamp === 0) {
      return 0;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((dueTimestamp - startOfToday.getTime()) / millisecondsPerDay);
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
