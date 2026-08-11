/**
 * Types and default configuration for Candidate Next Due Date progression rules
 */

export type InspectionResult =
  | 'Excellent'
  | 'Good'
  | 'Satisfactory'
  | 'Marginal'
  | 'Unsatisfactory';

export type PrimaryRule = 'Set Due Date' | 'Clear Due Date';

export type Unit = 'Years' | 'Months' | 'Days';

export type NextDueConfigRule = {
  ruleId: string;
  inspectionResult: InspectionResult;
  primaryRule: PrimaryRule;
  setNextDueDate: {
    unit: Unit;
    value: number;
  } | null;
  secondaryRule: 'Deactivate' | null;
  active: boolean;
};

// Inspection Result order as specified in requirements
export const INSPECTION_RESULTS: InspectionResult[] = [
  'Excellent',
  'Good',
  'Satisfactory',
  'Marginal',
  'Unsatisfactory',
];

// Default configuration as specified in requirements
export const DEFAULT_NEXT_DUE_CONFIG: NextDueConfigRule[] = [
  {
    ruleId: 'config-excellent',
    inspectionResult: 'Excellent',
    primaryRule: 'Set Due Date',
    setNextDueDate: { unit: 'Years', value: 2 },
    secondaryRule: null,
    active: true,
  },
  {
    ruleId: 'config-good',
    inspectionResult: 'Good',
    primaryRule: 'Set Due Date',
    setNextDueDate: { unit: 'Years', value: 2 },
    secondaryRule: null,
    active: true,
  },
  {
    ruleId: 'config-satisfactory',
    inspectionResult: 'Satisfactory',
    primaryRule: 'Set Due Date',
    setNextDueDate: { unit: 'Years', value: 2 },
    secondaryRule: null,
    active: true,
  },
  {
    ruleId: 'config-marginal',
    inspectionResult: 'Marginal',
    primaryRule: 'Set Due Date',
    setNextDueDate: { unit: 'Months', value: 6 },
    secondaryRule: null,
    active: true,
  },
  {
    ruleId: 'config-unsatisfactory',
    inspectionResult: 'Unsatisfactory',
    primaryRule: 'Clear Due Date',
    setNextDueDate: null,
    secondaryRule: 'Deactivate',
    active: true,
  },
];

export const PRIMARY_RULE_OPTIONS: PrimaryRule[] = ['Set Due Date', 'Clear Due Date'];

export const UNIT_OPTIONS: Unit[] = ['Years', 'Months', 'Days'];

export const SECONDARY_RULE_OPTIONS: Array<'Deactivate' | null> = ['Deactivate'];

/**
 * Format a set next due date value for display
 */
export function formatSetNextDueDate(setNextDueDate: NextDueConfigRule['setNextDueDate']): string {
  if (!setNextDueDate) return '';

  const unitDisplay = {
    Years: 'y',
    Months: 'm',
    Days: 'd',
  };

  return `${setNextDueDate.value} ${unitDisplay[setNextDueDate.unit]}`;
}
