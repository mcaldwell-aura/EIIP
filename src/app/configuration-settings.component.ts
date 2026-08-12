import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NavMenuService } from './nav-menu.service';
import { UnsavedChangesConfirmationModalComponent } from './unsaved-changes-confirmation-modal.component';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

type ConfigSettingsTabId = 'priority-scores' | 'next-due' | 'general';
type RangeType = 'Absolute' | 'Percentage';
type InspectionResult = 'Excellent' | 'Good' | 'Satisfactory' | 'Marginal' | 'Unsatisfactory';
type NextDueRuleOption = 'Set Due Date' | 'Clear Due Date';
type NextDueUnit = 'Years' | 'Months' | 'Days';
type DayOfWeek = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

type PriorityScoreFactor = {
  id: string;
  factorName: string;
  minimumValue: number;
  maximumValue: number;
  rangeType: RangeType;
  weight: number;
  description: string;
  active: boolean;
};

type PriorityScoreEditForm = {
  id: string;
  factorName: string;
  minimumValue: number;
  maximumValue: number;
  rangeType: RangeType;
  weight: number;
  description: string;
  active: boolean;
};

type ConfigSettingsTab = {
  id: ConfigSettingsTabId;
  label: string;
};

type GeneralConfig = {
  dayOfWeek: DayOfWeek;
  sendTime: string;
};

type NextDueConfigRecord = {
  inspectionResult: InspectionResult;
  rule: NextDueRuleOption | null;
  timeIntervalValue: number | null;
  timeIntervalUnit: NextDueUnit | null;
  setEndDate: boolean | null;
  active: boolean | null;
};

type NextDueEditForm = {
  inspectionResult: InspectionResult;
  rule: NextDueRuleOption;
  timeIntervalValue: number | null;
  timeIntervalUnit: NextDueUnit;
  setEndDate: boolean;
  active: boolean;
};

const DEFAULT_EDIT_FORM: PriorityScoreEditForm = {
  id: '',
  factorName: '',
  minimumValue: 0,
  maximumValue: 0,
  rangeType: 'Absolute',
  weight: 0,
  description: '',
  active: false,
};

const INSPECTION_RESULT_ORDER: readonly InspectionResult[] = [
  'Excellent',
  'Good',
  'Satisfactory',
  'Marginal',
  'Unsatisfactory',
];

const DEFAULT_NEXT_DUE_EDIT_FORM: NextDueEditForm = {
  inspectionResult: 'Excellent',
  rule: 'Set Due Date',
  timeIntervalValue: 1,
  timeIntervalUnit: 'Years',
  setEndDate: false,
  active: true,
};

const DAYS_OF_WEEK_OPTIONS: Array<{ label: DayOfWeek; value: DayOfWeek }> = [
  { label: 'Sunday', value: 'Sunday' },
  { label: 'Monday', value: 'Monday' },
  { label: 'Tuesday', value: 'Tuesday' },
  { label: 'Wednesday', value: 'Wednesday' },
  { label: 'Thursday', value: 'Thursday' },
  { label: 'Friday', value: 'Friday' },
  { label: 'Saturday', value: 'Saturday' },
];

const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
  dayOfWeek: 'Friday',
  sendTime: '06:00 PM',
};

function createHalfHourTimeOptions(): Array<{ label: string; value: string }> {
  const options: Array<{ label: string; value: string }> = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const twelveHour = hour % 12 === 0 ? 12 : hour % 12;
      const minuteText = minute === 0 ? '00' : '30';
      const display = `${String(twelveHour).padStart(2, '0')}:${minuteText} ${period}`;

      options.push({ label: display, value: display });
    }
  }

  return options;
}

@Component({
  selector: 'app-configuration-settings',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    RippleModule,
    SelectModule,
    TableModule,
    ToggleSwitchModule,
    UnsavedChangesConfirmationModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuration-settings.component.html',
  styleUrl: './configuration-settings.component.scss',
})
export class ConfigurationSettingsComponent {
  protected readonly menuService = inject(NavMenuService);

  protected readonly tabs: readonly ConfigSettingsTab[] = [
    { id: 'general', label: 'General' },
    { id: 'priority-scores', label: 'Priority Scores' },
    { id: 'next-due', label: 'Next Due' },
  ];
  protected readonly activeTab = signal<ConfigSettingsTabId>('general');
  protected readonly rows = signal<PriorityScoreFactor[]>([
    {
      id: 'risk-score',
      factorName: 'Risk Score',
      minimumValue: 0,
      maximumValue: 100,
      rangeType: 'Absolute',
      weight: 30,
      description: 'Measures baseline risk associated with the candidate or entity.',
      active: true,
    },
    {
      id: 'compliance-gap',
      factorName: 'Compliance Gap',
      minimumValue: 0,
      maximumValue: 25,
      rangeType: 'Absolute',
      weight: 20,
      description: 'Represents unresolved compliance findings from prior inspections.',
      active: true,
    },
    {
      id: 'volume-tier',
      factorName: 'Volume Tier',
      minimumValue: 1,
      maximumValue: 5,
      rangeType: 'Absolute',
      weight: 15,
      description: 'Prioritizes by assessed inspection volume category.',
      active: false,
    },
    {
      id: 'trend-change',
      factorName: 'Trend Change',
      minimumValue: -20,
      maximumValue: 20,
      rangeType: 'Percentage',
      weight: 35,
      description: 'Accounts for improvement or decline trends over recent periods.',
      active: true,
    },
  ]);

  protected readonly editDialogVisible = signal(false);
  protected readonly editForm = signal<PriorityScoreEditForm>(DEFAULT_EDIT_FORM);
  protected readonly rangeTypeOptions = [
    { label: 'Absolute', value: 'Absolute' as const },
    { label: 'Percentage', value: 'Percentage' as const },
  ];

  protected readonly nextDueRules = signal<NextDueConfigRecord[]>([
    {
      inspectionResult: 'Excellent',
      rule: 'Set Due Date',
      timeIntervalValue: 2,
      timeIntervalUnit: 'Years',
      setEndDate: false,
      active: true,
    },
    {
      inspectionResult: 'Good',
      rule: 'Set Due Date',
      timeIntervalValue: 2,
      timeIntervalUnit: 'Years',
      setEndDate: false,
      active: true,
    },
    {
      inspectionResult: 'Satisfactory',
      rule: 'Set Due Date',
      timeIntervalValue: 2,
      timeIntervalUnit: 'Years',
      setEndDate: false,
      active: true,
    },
    {
      inspectionResult: 'Marginal',
      rule: 'Set Due Date',
      timeIntervalValue: 6,
      timeIntervalUnit: 'Months',
      setEndDate: false,
      active: true,
    },
    {
      inspectionResult: 'Unsatisfactory',
      rule: 'Clear Due Date',
      timeIntervalValue: null,
      timeIntervalUnit: null,
      setEndDate: true,
      active: true,
    },
  ]);
  protected readonly nextDueRuleOptions = [
    { label: 'Set Due Date', value: 'Set Due Date' as const },
    { label: 'Clear Due Date', value: 'Clear Due Date' as const },
  ];
  protected readonly nextDueUnitOptions = [
    { label: 'Years', value: 'Years' as const },
    { label: 'Months', value: 'Months' as const },
    { label: 'Days', value: 'Days' as const },
  ];
  protected readonly nextDueEditVisible = signal(false);
  protected readonly nextDueEditForm = signal<NextDueEditForm>(DEFAULT_NEXT_DUE_EDIT_FORM);
  protected readonly generalSavedConfig = signal<GeneralConfig>(DEFAULT_GENERAL_CONFIG);
  protected readonly selectedGeneralDay = signal<DayOfWeek>(DEFAULT_GENERAL_CONFIG.dayOfWeek);
  protected readonly selectedGeneralTime = signal<string>(DEFAULT_GENERAL_CONFIG.sendTime);
  protected readonly generalDayOptions = DAYS_OF_WEEK_OPTIONS;
  protected readonly generalTimeOptions = createHalfHourTimeOptions();
  protected readonly showUnsavedModal = signal(false);

  private pendingLeaveResolver: ((allowLeave: boolean) => void) | null = null;

  protected readonly activeLabel = computed(() => (this.editForm().active ? 'On' : 'Off'));
  protected readonly nextDueActiveLabel = computed(() =>
    this.nextDueEditForm().active ? 'Yes' : 'No',
  );
  protected readonly nextDueSetEndDateLabel = computed(() =>
    this.nextDueEditForm().setEndDate ? 'Yes' : 'No',
  );
  protected readonly showNextDueIntervalFields = computed(
    () => this.nextDueEditForm().rule === 'Set Due Date',
  );
  protected readonly orderedNextDueRules = computed(() => {
    const lookup = new Map(
      this.nextDueRules().map((rule) => [rule.inspectionResult, rule] as const),
    );

    return INSPECTION_RESULT_ORDER.map(
      (result) =>
        lookup.get(result) ?? {
          inspectionResult: result,
          rule: null,
          timeIntervalValue: null,
          timeIntervalUnit: null,
          setEndDate: null,
          active: null,
        },
    );
  });
  protected readonly nextDueCanSave = computed(() => {
    const values = this.nextDueEditForm();

    if (values.rule !== 'Set Due Date') {
      return true;
    }

    return (
      values.timeIntervalValue !== null && values.timeIntervalValue > 0 && !!values.timeIntervalUnit
    );
  });
  protected readonly isGeneralDirty = computed(() => {
    const baseline = this.generalSavedConfig();

    return (
      this.selectedGeneralDay() !== baseline.dayOfWeek ||
      this.selectedGeneralTime() !== baseline.sendTime
    );
  });

  protected setActiveTab(tabId: ConfigSettingsTabId): void {
    this.activeTab.set(tabId);
  }

  protected openEditDialog(row: PriorityScoreFactor): void {
    this.editForm.set({
      id: row.id,
      factorName: row.factorName,
      minimumValue: row.minimumValue,
      maximumValue: row.maximumValue,
      rangeType: row.rangeType,
      weight: row.weight,
      description: row.description,
      active: row.active,
    });
    this.editDialogVisible.set(true);
  }

  protected cancelEdit(): void {
    this.editDialogVisible.set(false);
    this.editForm.set(DEFAULT_EDIT_FORM);
  }

  protected saveEdit(): void {
    const values = this.editForm();

    this.rows.update((current) =>
      current.map((row) => {
        if (row.id !== values.id) {
          return row;
        }

        return {
          ...row,
          factorName: values.factorName,
          minimumValue: values.minimumValue,
          maximumValue: values.maximumValue,
          rangeType: values.rangeType,
          weight: values.weight,
          description: values.description,
          active: values.active,
        };
      }),
    );

    this.cancelEdit();
  }

  protected updateFactorName(event: Event): void {
    this.editForm.update((current) => ({
      ...current,
      factorName: (event.target as HTMLInputElement).value,
    }));
  }

  protected updateMinimumValue(event: Event): void {
    const nextValue = Number((event.target as HTMLInputElement).value);

    this.editForm.update((current) => ({
      ...current,
      minimumValue: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  }

  protected updateMaximumValue(event: Event): void {
    const nextValue = Number((event.target as HTMLInputElement).value);

    this.editForm.update((current) => ({
      ...current,
      maximumValue: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  }

  protected updateRangeType(value: RangeType): void {
    this.editForm.update((current) => ({
      ...current,
      rangeType: value,
    }));
  }

  protected updateWeight(event: Event): void {
    const nextValue = Number((event.target as HTMLInputElement).value);

    this.editForm.update((current) => ({
      ...current,
      weight: Number.isNaN(nextValue) ? 0 : nextValue,
    }));
  }

  protected updateDescription(event: Event): void {
    this.editForm.update((current) => ({
      ...current,
      description: (event.target as HTMLInputElement).value,
    }));
  }

  protected updateActive(value: boolean): void {
    this.editForm.update((current) => ({
      ...current,
      active: value,
    }));
  }

  protected formatNextDueInterval(rule: NextDueConfigRecord): string {
    if (
      rule.rule !== 'Set Due Date' ||
      rule.timeIntervalValue === null ||
      rule.timeIntervalUnit === null
    ) {
      return '';
    }

    const unitSuffixByType: Record<NextDueUnit, string> = {
      Years: 'y',
      Months: 'm',
      Days: 'd',
    };

    return `${rule.timeIntervalValue}${unitSuffixByType[rule.timeIntervalUnit]}`;
  }

  protected formatNullableBoolean(value: boolean | null): string {
    if (value === null) {
      return '';
    }

    return value ? 'Yes' : 'No';
  }

  protected openNextDueEditModal(rule: NextDueConfigRecord): void {
    this.nextDueEditForm.set({
      inspectionResult: rule.inspectionResult,
      rule: rule.rule ?? 'Set Due Date',
      timeIntervalValue: rule.timeIntervalValue ?? 1,
      timeIntervalUnit: rule.timeIntervalUnit ?? 'Years',
      setEndDate: rule.setEndDate ?? false,
      active: rule.active ?? true,
    });
    this.nextDueEditVisible.set(true);
  }

  protected closeNextDueEditModal(): void {
    this.nextDueEditVisible.set(false);
    this.nextDueEditForm.set(DEFAULT_NEXT_DUE_EDIT_FORM);
  }

  protected saveNextDueEdit(): void {
    const values = this.nextDueEditForm();

    this.nextDueRules.update((current) =>
      current.map((rule) => {
        if (rule.inspectionResult !== values.inspectionResult) {
          return rule;
        }

        return {
          ...rule,
          rule: values.rule,
          timeIntervalValue: values.rule === 'Set Due Date' ? values.timeIntervalValue : null,
          timeIntervalUnit: values.rule === 'Set Due Date' ? values.timeIntervalUnit : null,
          setEndDate: values.setEndDate,
          active: values.active,
        };
      }),
    );

    this.closeNextDueEditModal();
  }

  protected updateNextDueRule(value: NextDueRuleOption): void {
    this.nextDueEditForm.update((current) => ({
      ...current,
      rule: value,
      timeIntervalValue: value === 'Set Due Date' ? (current.timeIntervalValue ?? 1) : null,
      timeIntervalUnit: value === 'Set Due Date' ? (current.timeIntervalUnit ?? 'Years') : 'Years',
    }));
  }

  protected updateNextDueIntervalValue(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D+/g, '').slice(0, 4);

    this.nextDueEditForm.update((current) => ({
      ...current,
      timeIntervalValue: digitsOnly.length > 0 ? Number(digitsOnly) : null,
    }));
  }

  protected updateNextDueUnit(value: NextDueUnit): void {
    this.nextDueEditForm.update((current) => ({
      ...current,
      timeIntervalUnit: value,
    }));
  }

  protected updateNextDueSetEndDate(value: boolean): void {
    this.nextDueEditForm.update((current) => ({
      ...current,
      setEndDate: value,
    }));
  }

  protected updateNextDueActive(value: boolean): void {
    this.nextDueEditForm.update((current) => ({
      ...current,
      active: value,
    }));
  }

  protected saveGeneralSettings(): void {
    const next = {
      dayOfWeek: this.selectedGeneralDay(),
      sendTime: this.selectedGeneralTime(),
    } as GeneralConfig;

    this.generalSavedConfig.set(next);
  }

  canDeactivatePage(): boolean | Promise<boolean> {
    if (!this.isGeneralDirty()) {
      return true;
    }

    this.showUnsavedModal.set(true);

    return new Promise<boolean>((resolve) => {
      this.pendingLeaveResolver = resolve;
    });
  }

  protected onUnsavedSave(): void {
    this.saveGeneralSettings();
    this.showUnsavedModal.set(false);
    this.resolvePendingLeave(true);
  }

  protected onUnsavedDiscard(): void {
    this.showUnsavedModal.set(false);
    this.resolvePendingLeave(true);
  }

  protected onUnsavedCancel(): void {
    this.showUnsavedModal.set(false);
    this.resolvePendingLeave(false);
  }

  private resolvePendingLeave(allowLeave: boolean): void {
    if (!this.pendingLeaveResolver) {
      return;
    }

    this.pendingLeaveResolver(allowLeave);
    this.pendingLeaveResolver = null;
  }
}
