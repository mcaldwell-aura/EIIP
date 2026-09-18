import {
  filterActiveCandidateAppointments,
  type CandidateAppointment,
} from './candidate-appointments';

describe('filterActiveCandidateAppointments', () => {
  it('keeps active appointments and removes canceled ones for the selected candidate', () => {
    const appointments: CandidateAppointment[] = [
      {
        candidateGuid: 'fred-johnson',
        dateTime: '2026-09-20T09:00',
        location: 'Austin Assessment Center',
        comments: 'Morning slot confirmed for the candidate.',
        appointmentStatus: 'Scheduled',
      },
      {
        candidateGuid: 'fred-johnson',
        dateTime: '2026-09-22T10:30',
        location: 'Dallas Metro Hub',
        comments: 'Canceled and hidden from active results.',
        appointmentStatus: 'Canceled',
      },
      {
        candidateGuid: 'fred-johnson',
        dateTime: '2026-09-24T11:45',
        location: 'Fort Worth North Site',
        comments: 'Already completed; retained only when active rules permit it.',
        appointmentStatus: 'Completed',
      },
      {
        candidateGuid: 'andrea-banks',
        dateTime: '2026-09-25T13:00',
        location: 'Houston Regional',
        comments: 'Another candidate appointment should remain separate.',
        appointmentStatus: 'Scheduled',
      },
    ];

    const result = filterActiveCandidateAppointments('fred-johnson', appointments);

    expect(result).toEqual([
      {
        candidateGuid: 'fred-johnson',
        dateTime: '2026-09-20T09:00',
        location: 'Austin Assessment Center',
        comments: 'Morning slot confirmed for the candidate.',
        appointmentStatus: 'Scheduled',
      },
      {
        candidateGuid: 'fred-johnson',
        dateTime: '2026-09-24T11:45',
        location: 'Fort Worth North Site',
        comments: 'Already completed; retained only when active rules permit it.',
        appointmentStatus: 'Completed',
      },
    ]);
  });

  it('returns an empty list when no active appointments exist for the selected candidate', () => {
    const appointments: CandidateAppointment[] = [
      {
        candidateGuid: 'candidate-999',
        dateTime: '2026-09-20T09:00',
        location: 'Austin Assessment Center',
        comments: 'Candidate-specific placeholder.',
        appointmentStatus: 'Canceled',
      },
    ];

    expect(filterActiveCandidateAppointments('fred-johnson', appointments)).toEqual([]);
  });
});
