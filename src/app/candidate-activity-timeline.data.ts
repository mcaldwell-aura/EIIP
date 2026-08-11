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

// Generate mock timeline events for multiple candidates
function generateMockEvents(): TimelineEventRecord[] {
  const events: TimelineEventRecord[] = [];
  let eventId = 0;

  const eventTypes: TimelineEventType[] = [
    'appointment-scheduled',
    'appointment-completed',
    'inspection-completed',
    'finding-added',
    'note-added',
    'attachment-added',
    'status-changed',
  ];

  const eventDescriptions: Record<TimelineEventType, string[]> = {
    'appointment-scheduled': [
      'Appointment scheduled for inspection',
      'Initial consultation scheduled',
      'Follow-up appointment scheduled',
      'Re-inspection appointment scheduled',
    ],
    'appointment-completed': [
      'Appointment completed successfully',
      'Consultation completed',
      'Follow-up appointment completed',
    ],
    'appointment-cancelled': ['Appointment cancelled by candidate', 'Appointment rescheduled'],
    'inspection-started': [
      'Inspection workflow initiated',
      'Routine inspection started',
      'Special inspection started',
    ],
    'inspection-completed': [
      'Inspection completed - No violations found',
      'Inspection completed - Minor violations noted',
      'Inspection completed - Corrective action required',
    ],
    'inspection-cancelled': ['Inspection cancelled', 'Inspection rescheduled'],
    'finding-added': [
      'Critical finding identified',
      'Non-compliance finding added',
      'Observation noted during inspection',
    ],
    'note-added': [
      'Inspector notes documented',
      'Follow-up notes added',
      'Administrative notes recorded',
    ],
    'attachment-added': [
      'Inspection report uploaded',
      'Corrective action plan received',
      'Supporting documentation attached',
    ],
    'status-changed': [
      'Status changed to Active',
      'Status changed to Pending',
      'Status changed to Closed',
    ],
    'source-update': ['Record updated from source system', 'External system synchronization'],
  };

  // Generate events for the first 20 candidates
  for (let candidateIndex = 1; candidateIndex <= 20; candidateIndex++) {
    const candidateId = `individual-${candidateIndex}`;
    const candidateEventCount = 3 + Math.floor(Math.random() * 4); // 3-6 events per candidate

    for (let i = 0; i < candidateEventCount; i++) {
      eventId++;
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const descriptions = eventDescriptions[eventType];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      // Create dates spread across the past year
      const daysAgo = Math.floor(Math.random() * 365);
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() - daysAgo);
      eventDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      events.push({
        eventId: `evt-${eventId}`,
        candidateId,
        eventType,
        eventSource: Math.random() > 0.5 ? 'EIIP' : 'CSTIMS',
        title: eventType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description,
        timestamp: eventDate.toISOString(),
        timestampMs: eventDate.getTime(),
      });
    }
  }

  // Generate events for the first 10 organizations
  for (let orgIndex = 1; orgIndex <= 10; orgIndex++) {
    const candidateId = `organization-${orgIndex}`;
    const candidateEventCount = 2 + Math.floor(Math.random() * 3); // 2-4 events per organization

    for (let i = 0; i < candidateEventCount; i++) {
      eventId++;
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const descriptions = eventDescriptions[eventType];
      const description = descriptions[Math.floor(Math.random() * descriptions.length)];

      // Create dates spread across the past year
      const daysAgo = Math.floor(Math.random() * 365);
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() - daysAgo);
      eventDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);

      events.push({
        eventId: `evt-${eventId}`,
        candidateId,
        eventType,
        eventSource: Math.random() > 0.5 ? 'EIIP' : 'CSTIMS',
        title: eventType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description,
        timestamp: eventDate.toISOString(),
        timestampMs: eventDate.getTime(),
      });
    }
  }

  return events;
}

export const TIMELINE_EVENTS: TimelineEventRecord[] = generateMockEvents();

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
