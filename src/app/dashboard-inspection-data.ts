export const INSPECTION_RESULTS = [
  { label: 'Excellent', color: '#244c3c' },
  { label: 'Good', color: '#4b8265' },
  { label: 'Satisfactory', color: '#9dbb8b' },
  { label: 'Marginal', color: '#c4863e' },
  { label: 'Unsatisfactory', color: '#d6b44c' },
] as const;

export const INSPECTION_REASONS = [
  { label: 'Change', color: '#1848b8' },
  { label: 'Original', color: '#5268a8' },
  { label: 'ReExam', color: '#8973ad' },
  { label: 'Reinstatement', color: '#627e98' },
  { label: 'Periodic', color: '#397c91' },
] as const;

export type DashboardInspection = {
  completionDate: Date;
  result: (typeof INSPECTION_RESULTS)[number]['label'];
  reason: (typeof INSPECTION_REASONS)[number]['label'];
  maturity: 'New' | 'Established';
  candidateType: 'Individual' | 'Organization';
};

// Prototype completion records, independent of the legacy appointment fixtures.
export function createDashboardInspections(today: Date): DashboardInspection[] {
  const counts = [
    [6, 9, 8, 4, 3],
    [8, 11, 6, 5, 2],
    [7, 10, 9, 3, 4],
  ];

  return counts.flatMap((monthCounts, monthIndex) =>
    monthCounts.flatMap((count, resultIndex) =>
      Array.from({ length: count }, (_, index): DashboardInspection => {
        const day = monthIndex === 2 ? Math.min(today.getDate(), 5 + index) : 5 + index;
        return {
          completionDate: new Date(today.getFullYear(), today.getMonth() - 2 + monthIndex, day),
          result: INSPECTION_RESULTS[resultIndex].label,
          reason: INSPECTION_REASONS[(index + resultIndex + monthIndex) % 5].label,
          maturity: index % 3 === 0 ? 'New' : 'Established',
          candidateType: index % 2 === 0 ? 'Individual' : 'Organization',
        };
      }),
    ),
  );
}
