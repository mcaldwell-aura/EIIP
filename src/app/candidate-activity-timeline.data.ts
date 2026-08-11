import { CANDIDATES, type CandidateRecord } from './candidates.data';
import { INSPECTIONS } from './inspection-data';

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

  // Iterate over all real candidates from CANDIDATES array
  CANDIDATES.forEach((candidate: CandidateRecord, candidateIndex: number) => {
    // Generate deterministic event count for this candidate (3-6 events)
    // Based on candidate index to ensure consistency
    const eventCount = 3 + (candidateIndex % 4);

    // Get candidate's display name for use in event descriptions
    const candidateDisplayName =
      candidate.candidateType === 'Individual'
        ? candidate.firstMiddleLast || candidate.candidateId
        : candidate.organizationName || candidate.candidateId;

    for (let i = 0; i < eventCount; i++) {
      eventId++;
      const eventType = eventTypes[eventId % eventTypes.length];
      const daysOffset = (eventId * 7) % 365;
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + daysOffset);

      events.push({
        eventId: `evt-${eventId}`,
        candidateId: candidate.candidateId,
        eventType,
        eventSource: eventId % 2 === 0 ? 'EIIP' : 'CSTIMS',
        title: eventType
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        description: `${eventType.split('-').join(' ')} for ${candidateDisplayName}`,
        timestamp: eventDate.toISOString(),
        timestampMs: eventDate.getTime(),
      });
    }
  });

  // Generate events for fallback subjects (candidates in inspection data but not in CANDIDATES array)
  // Get unique subjectIds from INSPECTIONS that aren't in CANDIDATES
  const candidateIds = new Set(CANDIDATES.map((c) => c.candidateId));
  const fallbackSubjects = new Map<string, string>(); // subjectId -> subjectName

  INSPECTIONS.forEach((inspection) => {
    if (!candidateIds.has(inspection.subjectId) && !fallbackSubjects.has(inspection.subjectId)) {
      fallbackSubjects.set(inspection.subjectId, inspection.subjectName);
    }
  });

  // Generate events for fallback subjects with consistent determinism
  // Start fallbackIndex from CANDIDATES.length to maintain consistent eventId offsets
  const fallbackArray = Array.from(fallbackSubjects.entries());
  fallbackArray.forEach(([subjectId, subjectName], arrayIndex) => {
    const fallbackCandidateIndex = CANDIDATES.length + arrayIndex;
    const eventCount = 3 + (fallbackCandidateIndex % 4);

    for (let i = 0; i < eventCount; i++) {
      eventId++;
      const eventType = eventTypes[eventId % eventTypes.length];
      const daysOffset = (eventId * 7) % 365;
      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() + daysOffset);

      events.push({
        eventId: `evt-${eventId}`,
        candidateId: subjectId,
        eventType,
        eventSource: eventId % 2 === 0 ? 'EIIP' : 'CSTIMS',
        title: eventType
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        description: `${eventType.split('-').join(' ')} for ${subjectName}`,
        timestamp: eventDate.toISOString(),
        timestampMs: eventDate.getTime(),
      });
    }
  });

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
