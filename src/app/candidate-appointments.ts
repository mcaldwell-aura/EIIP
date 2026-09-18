export type CandidateAppointmentStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Canceled'
  | 'No Show'
  | 'Rescheduled';

export type CandidateAppointment = {
  candidateGuid: string;
  dateTime: string;
  location: string;
  comments?: string;
  appointmentStatus: CandidateAppointmentStatus;
};

export const MOCK_CANDIDATE_APPOINTMENTS: CandidateAppointment[] = [
  {
    candidateGuid: 'fred-johnson',
    dateTime: '2026-09-20T09:00',
    location: 'Austin Assessment Center',
    comments: 'Candidate available for morning inspection and has confirmed interest in the site.',
    appointmentStatus: 'Scheduled',
  },
  {
    candidateGuid: 'fred-johnson',
    dateTime: '2026-09-22T10:30',
    location: 'Dallas Metro Hub',
    comments: 'This slot was canceled by the candidate and should remain hidden.',
    appointmentStatus: 'Canceled',
  },
  {
    candidateGuid: 'fred-johnson',
    dateTime: '2026-09-24T11:45',
    location: 'Fort Worth North Site',
    comments: 'Completed appointment from a prior cycle; no longer active.',
    appointmentStatus: 'Completed',
  },
  {
    candidateGuid: 'andrea-banks',
    dateTime: '2026-09-18T13:00',
    location: 'Harris Central Campus',
    comments: 'Available for afternoon alternate inspection.',
    appointmentStatus: 'Scheduled',
  },
  {
    candidateGuid: 'andrea-banks',
    dateTime: '2026-09-21T08:45',
    location: 'Collin Regional Site',
    comments: 'Canceled slot that should not appear in active results.',
    appointmentStatus: 'Canceled',
  },
  {
    candidateGuid: 'jamie-carter',
    dateTime: '2026-09-23T15:30',
    location: 'Phoenix Field Office',
    comments: 'Rescheduled appointment; still active during the candidate review window.',
    appointmentStatus: 'Rescheduled',
  },
];

export function filterActiveCandidateAppointments(
  candidateGuid: string,
  appointments: CandidateAppointment[],
): CandidateAppointment[] {
  const normalizedGuid = candidateGuid.trim();

  return appointments
    .filter(
      (appointment) =>
        appointment.candidateGuid.toLowerCase() === normalizedGuid.toLowerCase() &&
        appointment.appointmentStatus !== 'Canceled',
    )
    .sort((left, right) => new Date(left.dateTime).getTime() - new Date(right.dateTime).getTime());
}

export function formatCandidateAppointmentDateTime(dateTime: string): string {
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
