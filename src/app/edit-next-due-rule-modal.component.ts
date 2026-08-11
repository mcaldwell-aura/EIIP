import {
  ChangeDetectionStrategy,
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';

import {
  type NextDueConfigRule,
  type PrimaryRule,
  type Unit,
  PRIMARY_RULE_OPTIONS,
  UNIT_OPTIONS,
  SECONDARY_RULE_OPTIONS,
  INSPECTION_RESULTS,
} from './candidate-next-due-config.data';

@Component({
  selector: 'app-edit-next-due-rule-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    SelectModule,
    InputTextModule,
    CheckboxModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-next-due-rule-modal.component.html',
  styleUrl: './edit-next-due-rule-modal.component.scss',
})
export class EditNextDueRuleModalComponent {
  @Input() rule!: NextDueConfigRule;
  @Output() save = new EventEmitter<NextDueConfigRule>();
  @Output() cancel = new EventEmitter<void>();

  protected primaryRule = signal<PrimaryRule>(this.rule?.primaryRule || 'Set Due Date');
  protected unit = signal<Unit>(this.rule?.setNextDueDate?.unit || 'Years');
  protected dueValue = signal<number>(this.rule?.setNextDueDate?.value || 1);
  protected secondaryRule = signal<'Deactivate' | null>(this.rule?.secondaryRule || null);
  protected isActive = signal<boolean>(this.rule?.active ?? true);

  protected readonly primaryRuleOptions = PRIMARY_RULE_OPTIONS;
  protected readonly unitOptions = UNIT_OPTIONS;
  protected readonly secondaryRuleOptions = SECONDARY_RULE_OPTIONS;
  protected readonly inspectionResults = INSPECTION_RESULTS;

  protected readonly showSetNextDueDate = computed(() => this.primaryRule() === 'Set Due Date');

  ngOnInit(): void {
    if (this.rule) {
      this.primaryRule.set(this.rule.primaryRule);
      this.unit.set(this.rule.setNextDueDate?.unit || 'Years');
      this.dueValue.set(this.rule.setNextDueDate?.value || 1);
      this.secondaryRule.set(this.rule.secondaryRule);
      this.isActive.set(this.rule.active);
    }
  }

  protected onSave(): void {
    const updatedRule: NextDueConfigRule = {
      ...this.rule,
      primaryRule: this.primaryRule(),
      setNextDueDate:
        this.primaryRule() === 'Set Due Date'
          ? { unit: this.unit(), value: this.dueValue() }
          : null,
      secondaryRule: this.secondaryRule(),
      active: this.isActive(),
    };

    this.save.emit(updatedRule);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected clearSecondaryRule(): void {
    this.secondaryRule.set(null);
  }
}
