export type InspectorRecord = {
  inspectorId: string;
  name: string;
  region: string;
  lastInspectionDate: string | null;
  externalIdentifier?: string;
  inspectionAssignee?: string;
  active: boolean;
};

export const INSPECTORS: InspectorRecord[] = [
  {
    inspectorId: 'inspector-1',
    name: 'Maya Rodriguez',
    region: 'Northwest',
    lastInspectionDate: '2026-07-29',
    inspectionAssignee: 'Monique Hale',
    active: true,
  },
  {
    inspectorId: 'inspector-2',
    name: 'Caleb Turner',
    region: 'Southwest',
    lastInspectionDate: '2026-07-17',
    inspectionAssignee: 'Jordan Alvarez',
    active: true,
  },
  {
    inspectorId: 'inspector-3',
    name: 'Nina Campbell',
    region: 'Central',
    lastInspectionDate: '2026-06-30',
    inspectionAssignee: 'Darren Ng',
    active: false,
  },
  {
    inspectorId: 'inspector-4',
    name: 'Jordan Patel',
    region: 'Northeast',
    lastInspectionDate: '2026-08-04',
    inspectionAssignee: 'Priya Shah',
    active: true,
  },
  {
    inspectorId: 'inspector-5',
    name: 'Avery Nguyen',
    region: 'Southeast',
    lastInspectionDate: '2026-07-12',
    inspectionAssignee: 'Leah Stone',
    active: true,
  },
  {
    inspectorId: 'inspector-6',
    name: 'Derek Foster',
    region: 'Central',
    lastInspectionDate: '2026-05-19',
    inspectionAssignee: 'Unassigned',
    active: false,
  },
  {
    inspectorId: 'inspector-7',
    name: 'Leah Simmons',
    region: 'Northwest',
    lastInspectionDate: '2026-08-01',
    inspectionAssignee: 'Monique Hale',
    active: true,
  },
  {
    inspectorId: 'inspector-8',
    name: 'Oscar Bennett',
    region: 'Southwest',
    lastInspectionDate: '2026-06-21',
    inspectionAssignee: 'Jordan Alvarez',
    active: false,
  },
  {
    inspectorId: 'inspector-9',
    name: 'Rina Hall',
    region: 'Northeast',
    lastInspectionDate: '2026-07-08',
    inspectionAssignee: 'Monique Hale',
    active: true,
  },
  {
    inspectorId: 'inspector-10',
    name: 'Victor Owens',
    region: 'Southeast',
    lastInspectionDate: null,
    inspectionAssignee: 'Leah Stone',
    active: true,
  },
  {
    inspectorId: 'inspector-11',
    name: 'Emma Brooks',
    region: 'Central',
    lastInspectionDate: '2026-04-14',
    inspectionAssignee: 'Darren Ng',
    active: false,
  },
  {
    inspectorId: 'inspector-12',
    name: 'Samuel Price',
    region: 'Northwest',
    lastInspectionDate: '2026-07-26',
    inspectionAssignee: 'Priya Shah',
    active: true,
  },
];
