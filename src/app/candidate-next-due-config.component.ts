import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TableModule } from 'primeng/table';

import { NavMenuService } from './nav-menu.service';
import { NextDueConfigService } from './next-due-config.service';
import { EditNextDueRuleModalComponent } from './edit-next-due-rule-modal.component';
import { formatSetNextDueDate, type NextDueConfigRule } from './candidate-next-due-config.data';

@Component({
  selector: 'app-candidate-next-due-config',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    TableModule,
    EditNextDueRuleModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candidate-next-due-config.component.html',
  styleUrl: './candidate-next-due-config.component.scss',
})
export class CandidateNextDueConfigComponent {
  private readonly configService = inject(NextDueConfigService);
  protected readonly menuService = inject(NavMenuService);

  protected readonly rules = this.configService.rules;
  protected readonly editingRule = signal<NextDueConfigRule | null>(null);

  protected formatSetNextDueDate = formatSetNextDueDate;

  protected openEditModal(rule: NextDueConfigRule): void {
    this.editingRule.set(rule);
  }

  protected onSaveRule(updatedRule: NextDueConfigRule): void {
    this.configService.updateRule(updatedRule);
    this.editingRule.set(null);
  }

  protected onCancelEdit(): void {
    this.editingRule.set(null);
  }
}
