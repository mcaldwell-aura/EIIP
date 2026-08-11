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

// Pre-generated static mock data with fixed timestamps
// This avoids build-time execution issues and ensures consistency across deployments
function buildTimelineEvents(): TimelineEventRecord[] {
  const baseDate = new Date('2025-01-01');
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

  // Static event count per candidate for consistency
  const eventCountPerCandidate = {
    individual: [4, 5, 3, 6, 4, 5, 3, 4, 5, 3, 6, 4, 5, 3, 4, 5, 3, 4, 5, 3],
    organization: [3, 2, 4, 3, 2, 4, 3, 2, 4, 3],
  };

  // Generate events for the first 20 individuals
  for (let candidateIndex = 1; candidateIndex <= 20; candidateIndex++) {
    const candidateId = `individual-${candidateIndex}`;
    const eventCount = eventCountPerCandidate.individual[candidateIndex - 1] || 4;

    for (let i = 0; i < eventCount; i++) {
      eventId++;
      const eventType = eventTypes[eventId % eventTypes.length];
      const daysOffset = (eventId * 7) % 365;
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + daysOffset);

      events.push({
        eventId: `evt-${eventId}`,
        candidateId,
        eventType,
        eventSource: eventId % 2 === 0 ? 'EIIP' : 'CSTIMS',
        title: eventType
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        description: `${eventType.split('-').join(' ')} for candidate ${candidateId}`,
        timestamp: eventDate.toISOString(),
        timestampMs: eventDate.getTime(),
      });
    }
  }

  // Generate events for the first 10 organizations
  for (let orgIndex = 1; orgIndex <= 10; orgIndex++) {
    const candidateId = `organization-${orgIndex}`;
    const eventCount = eventCountPerCandidate.organization[orgIndex - 1] || 3;

    for (let i = 0; i < eventCount; i++) {
      eventId++;
      const eventType = eventTypes[eventId % eventTypes.length];
      const daysOffset = (eventId * 7) % 365;
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + daysOffset);

      events.push({
        eventId: `evt-${eventId}`,
        candidateId,
        eventType,
        eventSource: eventId % 2 === 0 ? 'EIIP' : 'CSTIMS',
        title: eventType
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        description: `${eventType.split('-').join(' ')} for organization ${candidateId}`,
        timestamp: eventDate.toISOString(),
        timestampMs: eventDate.getTime(),
      });
    }
  }

  return events;
}

export const TIMELINE_EVENTS: TimelineEventRecord[] = buildTimelineEvents();

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
