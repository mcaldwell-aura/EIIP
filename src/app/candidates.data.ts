export type CandidateType = 'Individual' | 'Organization';

export type CandidateRecord = {
  candidateId: string;
  firstMiddleLast: string | null;
  organizationName: string | null;
  candidateType: CandidateType;
  startDate: string;
  endDate: string | null;
  nextDueDate: string;
};

const FIRST_NAMES = [
  'Alyssa',
  'Brandon',
  'Carlos',
  'Diana',
  'Ethan',
  'Farah',
  'Grace',
  'Henry',
  'Isla',
  'Jordan',
  'Kai',
  'Lena',
  'Mason',
  'Nina',
  'Owen',
  'Priya',
  'Quinn',
  'Riley',
  'Sofia',
  'Theo',
  'Uma',
  'Victor',
  'Willow',
  'Xavier',
  'Yara',
  'Zane',
];

const MIDDLE_NAMES = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.', 'G.', 'H.', 'J.', 'K.', 'L.', 'M.', 'N.'];

const LAST_NAMES = [
  'Campos',
  'Lin',
  'Vega',
  'Reeves',
  'Patel',
  'Nouri',
  'Ito',
  'Brooks',
  'Foster',
  'Owens',
  'Alvarez',
  'Turner',
  'Bennett',
  'Diaz',
  'Ellis',
  'Carter',
  'Nguyen',
  'Morris',
];

const ORGANIZATION_NAMES = [
  'Atlas Transport Group',
  'Blue Harbor Logistics',
  'Crownline Testing Services',
  'Delta Freight Partners',
  'Evergreen Driver Solutions',
  'Frontier Compliance Co.',
  'Granite Fleet Services',
  'Highway Skills Institute',
  'Ironwood Transit Group',
  'Juniper Roadway Systems',
  'Keystone Mobility Partners',
  'Liberty Haulage Network',
  'Metro Safety Alliance',
  'Northstar Carrier Group',
  'Oak Ridge Transport',
  'Pioneer Motor Services',
  'Quantum Fleet Advisors',
  'Redwood Vehicle Academy',
  'Summit Transit Bureau',
  'Trailhead Driver Network',
  'Union Freight Collective',
  'Valley Compliance Group',
  'Westbridge Mobility',
  'Yellow Pine Logistics',
];

function formatDateValue(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${year}-${month}-${day}`;
}

function buildCandidates(): CandidateRecord[] {
  const individuals = Array.from({ length: 36 }, (_, index) => {
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const middleName = MIDDLE_NAMES[index % MIDDLE_NAMES.length];
    const lastName = LAST_NAMES[index % LAST_NAMES.length];
    const startDate = new Date(2024, index % 12, (index % 27) + 1);
    const shouldBeActive = index % 5 !== 0;
    const endDate = shouldBeActive
      ? null
      : new Date(2025, (index + 2) % 12, ((index + 7) % 27) + 1);
    const nextDueDate = new Date(2026, (index + 1) % 12, ((index * 3) % 27) + 1);

    return {
      candidateId: `individual-${index + 1}`,
      firstMiddleLast: `${firstName} ${middleName} ${lastName}`,
      organizationName: null,
      candidateType: 'Individual',
      startDate: formatDateValue(startDate),
      endDate: endDate ? formatDateValue(endDate) : null,
      nextDueDate: formatDateValue(nextDueDate),
    } satisfies CandidateRecord;
  });

  const organizations = Array.from({ length: 24 }, (_, index) => {
    const organizationName = ORGANIZATION_NAMES[index % ORGANIZATION_NAMES.length];
    const startDate = new Date(2023, (index + 3) % 12, ((index * 2) % 27) + 1);
    const shouldBeActive = index % 4 !== 0;
    const endDate = shouldBeActive
      ? null
      : new Date(2025, (index + 5) % 12, ((index + 11) % 27) + 1);
    const nextDueDate = new Date(2026, (index + 4) % 12, ((index * 4) % 27) + 1);

    return {
      candidateId: `organization-${index + 1}`,
      firstMiddleLast: null,
      organizationName,
      candidateType: 'Organization',
      startDate: formatDateValue(startDate),
      endDate: endDate ? formatDateValue(endDate) : null,
      nextDueDate: formatDateValue(nextDueDate),
    } satisfies CandidateRecord;
  });

  return [...individuals, ...organizations];
}

export const CANDIDATES = buildCandidates();
