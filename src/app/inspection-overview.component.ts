import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { INSPECTIONS, type InspectionRecord, type InspectionStatus } from './inspection-data';

type DueDateFilter = 'all' | 'next-7-days' | 'next-30-days' | 'after-30-days';
type PriorityFilter = 'all' | 'high' | 'medium' | 'low';
type SortField =
  | 'subjectName'
  | 'nextDue'
  | 'priority'
  | 'inspectionReason'
  | 'inspectionStatus'
  | 'inspectionType'
  | 'appointmentDate';
type SortDirection = 'asc' | 'desc';
type ToolbarSortSelection = 'default' | 'asc' | 'desc' | 'attention-first';

type PriorityContext = {
  why: string;
  lastInspectionScore: string;
  planningCycle: string;
  lastInspected: string;
  entityType: string;
};

const PRIORITY_CONTEXT: Record<string, PriorityContext> = {
  '892749': {
    why: 'This examiner has been prioritized because the pass rate for administered road tests has significantly exceeded the regional average over the past six months, and the required annual inspection cycle is overdue.',
    lastInspectionScore: 'Pass',
    planningCycle: 'Annual 2024-2025',
    lastInspected: '10-15-2026',
    entityType: 'Subject',
  },
};

@Component({
  selector: 'app-inspection-overview',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspection-overview.component.html',
  styleUrl: './inspection-overview.component.scss',
})
export class InspectionOverviewComponent {
  protected readonly rows = signal(INSPECTIONS);
  protected readonly dueDateFilter = signal<DueDateFilter>('all');
  protected readonly priorityFilter = signal<PriorityFilter>('all');
  protected readonly statusFilter = signal<InspectionStatus | 'all'>('all');
  protected readonly activeSortField = signal<SortField>('priority');
  protected readonly activeSortDirection = signal<SortDirection>('desc');
  protected readonly selectedPriorityRow = signal<InspectionRecord | null>(null);
  protected readonly visibleRows = computed(() => {
    const dueDateFilter = this.dueDateFilter();
    const priorityFilter = this.priorityFilter();
    const statusFilter = this.statusFilter();
    const activeSortField = this.activeSortField();
    const activeSortDirection = this.activeSortDirection();

    const filteredRows = this.rows().filter((row) => {
      const dueDate = this.parseDate(row.nextDue);
      const daysUntilDue = this.dayDifferenceFromToday(dueDate);
      const matchesDueDate =
        dueDateFilter === 'all' ||
        (dueDateFilter === 'next-7-days' && daysUntilDue <= 7) ||
        (dueDateFilter === 'next-30-days' && daysUntilDue > 7 && daysUntilDue <= 30) ||
        (dueDateFilter === 'after-30-days' && daysUntilDue > 30);
      const matchesPriority =
        priorityFilter === 'all' ||
        (priorityFilter === 'high' && row.priority >= 85) ||
        (priorityFilter === 'medium' && row.priority >= 50 && row.priority < 85) ||
        (priorityFilter === 'low' && row.priority < 50);
      const matchesStatus = statusFilter === 'all' || row.inspectionStatus === statusFilter;

      return matchesDueDate && matchesPriority && matchesStatus;
    });

    return [...filteredRows].sort((leftRow, rightRow) => {
      const directionMultiplier = activeSortDirection === 'asc' ? 1 : -1;

      switch (activeSortField) {
        case 'priority':
          return (leftRow.priority - rightRow.priority) * directionMultiplier;
        case 'nextDue':
          return (
            (this.parseDate(leftRow.nextDue).getTime() -
              this.parseDate(rightRow.nextDue).getTime()) *
            directionMultiplier
          );
        case 'appointmentDate':
          return (
            (this.parseDate(leftRow.appointmentDate).getTime() -
              this.parseDate(rightRow.appointmentDate).getTime()) *
            directionMultiplier
          );
        case 'inspectionStatus':
          return (
            leftRow.inspectionStatus.localeCompare(rightRow.inspectionStatus) * directionMultiplier
          );
        case 'inspectionType':
          return (
            leftRow.inspectionType.localeCompare(rightRow.inspectionType) * directionMultiplier
          );
        case 'inspectionReason':
          return (
            leftRow.inspectionReason.localeCompare(rightRow.inspectionReason) * directionMultiplier
          );
        case 'subjectName':
        default:
          return leftRow.subjectName.localeCompare(rightRow.subjectName) * directionMultiplier;
      }
    });
  });
  protected readonly selectedPrioritySort = computed<ToolbarSortSelection>(() => {
    if (this.activeSortField() !== 'priority') {
      return 'default';
    }

    return this.activeSortDirection();
  });
  protected readonly selectedStatusSort = computed<ToolbarSortSelection>(() => {
    if (this.activeSortField() !== 'inspectionStatus') {
      return 'default';
    }

    return this.activeSortDirection();
  });
  protected readonly selectedAppointmentSort = computed<ToolbarSortSelection>(() => {
    if (this.activeSortField() !== 'appointmentDate') {
      return 'default';
    }

    return this.activeSortDirection();
  });
  protected readonly selectedPriorityContext = computed(() => {
    const row = this.selectedPriorityRow();
    if (!row) {
      return null;
    }

    const fallback: PriorityContext = {
      why: `This subject is prioritized because ${row.inspectionReason.toLowerCase()} activity and a score of ${row.priority} indicate elevated review attention ahead of the next due date of ${row.nextDue}.`,
      lastInspectionScore: row.inspectionStatus === 'Unsatisfactory' ? 'Fail' : 'Pass',
      planningCycle: 'Annual 2024-2025',
      lastInspected: row.appointmentDate,
      entityType: 'Subject',
    };

    return {
      ...fallback,
      ...(PRIORITY_CONTEXT[row.inspectionId] ?? {}),
      score: `${row.priority}/100`,
      level: this.priorityLevel(row.priority),
    };
  });

  protected requiresAttention(status: InspectionStatus): boolean {
    return status === 'Planned' || status === 'Unsatisfactory';
  }

  protected updateDueDateFilter(event: Event): void {
    this.dueDateFilter.set((event.target as HTMLSelectElement).value as DueDateFilter);
  }

  protected updatePriorityFilter(event: Event): void {
    this.priorityFilter.set((event.target as HTMLSelectElement).value as PriorityFilter);
  }

  protected updateStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as InspectionStatus | 'all');
  }

  protected updatePrioritySort(event: Event): void {
    this.applyToolbarSort(
      'priority',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected updateStatusSort(event: Event): void {
    this.applyToolbarSort(
      'inspectionStatus',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected updateAppointmentSort(event: Event): void {
    this.applyToolbarSort(
      'appointmentDate',
      (event.target as HTMLSelectElement).value as ToolbarSortSelection,
    );
  }

  protected setSort(field: SortField): void {
    if (this.activeSortField() === field) {
      this.activeSortDirection.set(this.activeSortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.activeSortField.set(field);
    this.activeSortDirection.set(field === 'priority' ? 'desc' : 'asc');
  }

  protected sortIndicator(field: SortField): string {
    if (this.activeSortField() !== field) {
      return '↕';
    }

    return this.activeSortDirection() === 'asc' ? '↑' : '↓';
  }

  protected openPriorityModal(row: InspectionRecord): void {
    this.selectedPriorityRow.set(row);
  }

  protected closePriorityModal(): void {
    this.selectedPriorityRow.set(null);
  }

  protected priorityLevel(priority: number): 'High' | 'Medium' | 'Low' {
    if (priority >= 85) {
      return 'High';
    }

    if (priority >= 50) {
      return 'Medium';
    }

    return 'Low';
  }

  private applyToolbarSort(field: SortField, selection: ToolbarSortSelection): void {
    if (selection === 'default' || selection === 'attention-first') {
      this.activeSortField.set('priority');
      this.activeSortDirection.set('desc');
      return;
    }

    this.activeSortField.set(field);
    this.activeSortDirection.set(selection);
  }

  private parseDate(value: string): Date {
    const [monthText = '1', dayText = '1', yearText = '2000'] = value.split('-');
    const month = Number(monthText) - 1;
    const day = Number(dayText);
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);

    return new Date(year, month, day);
  }

  private dayDifferenceFromToday(date: Date): number {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    return Math.floor((date.getTime() - startOfToday.getTime()) / millisecondsPerDay);
  }
}
