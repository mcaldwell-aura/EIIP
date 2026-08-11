import { Injectable, signal, computed } from '@angular/core';
import {
  DEFAULT_NEXT_DUE_CONFIG,
  INSPECTION_RESULTS,
  type NextDueConfigRule,
  type InspectionResult,
} from './candidate-next-due-config.data';

export type RuleEnforcementResult = {
  nextDueDate: string | null;
  endDate: string | null;
  shouldDeactivate: boolean;
};

@Injectable({ providedIn: 'root' })
export class NextDueConfigService {
  private readonly configRules = signal<NextDueConfigRule[]>(DEFAULT_NEXT_DUE_CONFIG);

  readonly rules = this.configRules.asReadonly();

  readonly rulesByResult = computed(() => {
    const map = new Map<InspectionResult, NextDueConfigRule>();
    this.rules().forEach((rule) => {
      map.set(rule.inspectionResult, rule);
    });
    return map;
  });

  /**
   * Get all rules in the specified order
   */
  getAllRules(): NextDueConfigRule[] {
    return this.rules().sort(
      (a, b) =>
        INSPECTION_RESULTS.indexOf(a.inspectionResult) -
        INSPECTION_RESULTS.indexOf(b.inspectionResult),
    );
  }

  /**
   * Get a specific rule by inspection result
   */
  getRuleByResult(inspectionResult: InspectionResult): NextDueConfigRule | undefined {
    return this.rules().find((rule) => rule.inspectionResult === inspectionResult);
  }

  /**
   * Update a rule
   */
  updateRule(updatedRule: NextDueConfigRule): void {
    this.configRules.update((rules) =>
      rules.map((rule) => (rule.ruleId === updatedRule.ruleId ? updatedRule : rule)),
    );
  }

  /**
   * Reset to default configuration
   */
  resetToDefaults(): void {
    this.configRules.set(DEFAULT_NEXT_DUE_CONFIG);
  }

  /**
   * Apply progression rules to calculate next due date and end date
   * Called when an inspection is closed with status "Completed"
   *
   * @param inspectionResult - The inspection result (Excellent, Good, etc.)
   * @param completionDate - The inspection completion date (ISO format)
   * @returns RuleEnforcementResult containing the calculated dates and deactivation flag
   */
  applyProgressionRules(
    inspectionResult: InspectionResult,
    completionDate: string,
  ): RuleEnforcementResult {
    const rule = this.getRuleByResult(inspectionResult);

    if (!rule) {
      return {
        nextDueDate: null,
        endDate: null,
        shouldDeactivate: false,
      };
    }

    const nextDueDate = this.calculateNextDueDate(rule, completionDate);
    const shouldDeactivate = rule.secondaryRule === 'Deactivate';

    return {
      nextDueDate,
      endDate: shouldDeactivate ? completionDate : null,
      shouldDeactivate,
    };
  }

  /**
   * Calculate the next due date based on the rule and completion date
   */
  private calculateNextDueDate(rule: NextDueConfigRule, completionDate: string): string | null {
    if (rule.primaryRule === 'Clear Due Date') {
      return null;
    }

    if (rule.primaryRule === 'Set Due Date' && rule.setNextDueDate) {
      return this.addDateInterval(
        completionDate,
        rule.setNextDueDate.unit,
        rule.setNextDueDate.value,
      );
    }

    return null;
  }

  /**
   * Add a time interval to a date
   */
  private addDateInterval(
    dateString: string,
    unit: 'Years' | 'Months' | 'Days',
    value: number,
  ): string {
    const date = new Date(dateString);

    switch (unit) {
      case 'Years':
        date.setFullYear(date.getFullYear() + value);
        break;
      case 'Months':
        date.setMonth(date.getMonth() + value);
        break;
      case 'Days':
        date.setDate(date.getDate() + value);
        break;
    }

    return date.toISOString().split('T')[0];
  }
}
