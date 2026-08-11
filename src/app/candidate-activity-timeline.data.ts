export type TimelineEventType =
  | 'appointment-scheduled'
  | 'appointment-completed'
  | 'appointment-cancelled'
  | 'inspection-started'
  | 'inspection-completed'
  | 'inspection-cancelled'
  | 'finding-added'
  | 'note-added'
  | 'attachment-added'
  | 'status-changed'
  | 'source-update';

export type TimelineEventSource = 'EIIP' | 'CSTIMS' | 'Manual';

export type TimelineEventRecord = {
  eventId: string;
  candidateId: string;
  eventType: TimelineEventType;
  eventSource: TimelineEventSource;
  title: string;
  description: string;
  timestamp: string; // ISO 8601 format
  timestampMs: number; // Milliseconds since epoch for sorting
  actionLink?: {
    label: string;
    path: string;
  };
  metadata?: Record<string, string>;
};

export const TIMELINE_EVENTS: TimelineEventRecord[] = [
  // Alyssa A. Foster (individual-27) - example timeline
  {
    eventId: 'evt-001',
    candidateId: 'individual-27',
    eventType: 'appointment-scheduled',
    eventSource: 'CSTIMS',
    title: 'Appointment scheduled',
    description: 'Appointment on 05/20/2025 updated from 10:00 AM to 1:00 PM.',
    timestamp: '2025-05-14T21:41:00Z',
    timestampMs: new Date('2025-05-14T21:41:00Z').getTime(),
    actionLink: {
      label: 'View appointment',
      path: '/candidates/fred-johnson/appointments',
    },
  },
  {
    eventId: 'evt-002',
    candidateId: 'individual-27',
    eventType: 'inspection-completed',
    eventSource: 'EIIP',
    title: 'Inspection completed',
    description: 'Routine inspection completed by John Smith. Result: No violations.',
    timestamp: '2025-05-12T19:15:00Z',
    timestampMs: new Date('2025-05-12T19:15:00Z').getTime(),
    actionLink: {
      label: 'View inspection',
      path: '/inspections/892749',
    },
  },
  {
    eventId: 'evt-003',
    candidateId: 'individual-27',
    eventType: 'note-added',
    eventSource: 'EIIP',
    title: 'Note added',
    description: 'Inspector contacted facility to confirm corrective action.',
    timestamp: '2025-05-12T17:10:00Z',
    timestampMs: new Date('2025-05-12T17:10:00Z').getTime(),
    actionLink: {
      label: 'View note',
      path: '/candidates/fred-johnson/notes',
    },
  },
  {
    eventId: 'evt-004',
    candidateId: 'individual-27',
    eventType: 'attachment-added',
    eventSource: 'EIIP',
    title: 'Attachment added',
    description: 'Corrective action plan received from facility — CAP_ABC_Supply_051225.pdf',
    timestamp: '2025-05-12T15:58:00Z',
    timestampMs: new Date('2025-05-12T15:58:00Z').getTime(),
    actionLink: {
      label: 'View attachment',
      path: '/candidates/fred-johnson/attachments',
    },
  },
  {
    eventId: 'evt-005',
    candidateId: 'individual-27',
    eventType: 'status-changed',
    eventSource: 'EIIP',
    title: 'Status changed',
    description: 'Status changed from Scheduled to Active.',
    timestamp: '2025-05-10T08:30:00Z',
    timestampMs: new Date('2025-05-10T08:30:00Z').getTime(),
  },
  {
    eventId: 'evt-006',
    candidateId: 'individual-27',
    eventType: 'finding-added',
    eventSource: 'EIIP',
    title: 'Finding added',
    description: 'Critical finding identified during routine inspection.',
    timestamp: '2025-05-09T14:22:00Z',
    timestampMs: new Date('2025-05-09T14:22:00Z').getTime(),
    actionLink: {
      label: 'View finding',
      path: '/candidates/fred-johnson/findings',
    },
  },
  {
    eventId: 'evt-007',
    candidateId: 'individual-27',
    eventType: 'appointment-scheduled',
    eventSource: 'EIIP',
    title: 'Appointment scheduled',
    description: 'Initial inspection appointment scheduled with inspector.',
    timestamp: '2025-05-08T11:45:00Z',
    timestampMs: new Date('2025-05-08T11:45:00Z').getTime(),
    actionLink: {
      label: 'View appointment',
      path: '/candidates/fred-johnson/appointments',
    },
  },
  {
    eventId: 'evt-008',
    candidateId: 'individual-27',
    eventType: 'source-update',
    eventSource: 'CSTIMS',
    title: 'Source system updated',
    description: 'Candidate record updated in source system.',
    timestamp: '2025-05-05T09:00:00Z',
    timestampMs: new Date('2025-05-05T09:00:00Z').getTime(),
  },
  {
    eventId: 'evt-009',
    candidateId: 'individual-27',
    eventType: 'inspection-started',
    eventSource: 'EIIP',
    title: 'Inspection started',
    description: 'Inspection workflow initiated.',
    timestamp: '2025-05-01T08:00:00Z',
    timestampMs: new Date('2025-05-01T08:00:00Z').getTime(),
    actionLink: {
      label: 'View inspection',
      path: '/inspections/892749',
    },
  },
  {
    eventId: 'evt-010',
    candidateId: 'individual-27',
    eventType: 'status-changed',
    eventSource: 'EIIP',
    title: 'Status changed',
    description: 'Status changed from New to Pending.',
    timestamp: '2025-04-28T10:30:00Z',
    timestampMs: new Date('2025-04-28T10:30:00Z').getTime(),
  },
  {
    eventId: 'evt-011',
    candidateId: 'individual-27',
    eventType: 'appointment-scheduled',
    eventSource: 'EIIP',
    title: 'Appointment scheduled',
    description: 'Follow-up appointment scheduled.',
    timestamp: '2025-04-25T13:15:00Z',
    timestampMs: new Date('2025-04-25T13:15:00Z').getTime(),
    actionLink: {
      label: 'View appointment',
      path: '/candidates/fred-johnson/appointments',
    },
  },
  {
    eventId: 'evt-012',
    candidateId: 'individual-27',
    eventType: 'note-added',
    eventSource: 'EIIP',
    title: 'Note added',
    description: 'Preliminary review notes documented.',
    timestamp: '2025-04-20T16:45:00Z',
    timestampMs: new Date('2025-04-20T16:45:00Z').getTime(),
    actionLink: {
      label: 'View note',
      path: '/candidates/fred-johnson/notes',
    },
  },
];

export const TIMELINE_EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  'appointment-scheduled': 'Appointment scheduled',
  'appointment-completed': 'Appointment completed',
  'appointment-cancelled': 'Appointment cancelled',
  'inspection-started': 'Inspection started',
  'inspection-completed': 'Inspection completed',
  'inspection-cancelled': 'Inspection cancelled',
  'finding-added': 'Finding added',
  'note-added': 'Note added',
  'attachment-added': 'Attachment added',
  'status-changed': 'Status changed',
  'source-update': 'Source system updated',
};

export const TIMELINE_EVENT_ICONS: Record<TimelineEventType, string> = {
  'appointment-scheduled': 'pi-calendar-plus',
  'appointment-completed': 'pi-check',
  'appointment-cancelled': 'pi-calendar-times',
  'inspection-started': 'pi-flag',
  'inspection-completed': 'pi-check-circle',
  'inspection-cancelled': 'pi-times-circle',
  'finding-added': 'pi-exclamation-circle',
  'note-added': 'pi-comment',
  'attachment-added': 'pi-paperclip',
  'status-changed': 'pi-sync',
  'source-update': 'pi-refresh',
};
