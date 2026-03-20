import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type SummaryCard = {
  label: string;
  value: number;
};

type ExaminerGroup = {
  title: string;
  total: number;
  newCount: number;
  established: number;
};

type ChartDatum = {
  label: string;
  value: number;
};

type ActivityRow = {
  subjectName: string;
  nextDue: string;
  priority: number;
  inspectionReason: string;
  inspectionStatus: 'Scheduled' | 'Planned';
  inspectionType: 'Overt' | 'Covert';
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  protected readonly summaryCards = signal<SummaryCard[]>([
    { label: 'Inspections This Week', value: 12 },
    { label: 'Active Inspections', value: 7 },
    { label: 'Inspections to Review', value: 3 },
    { label: 'Missed Inspections', value: 2 },
  ]);

  protected readonly examinerGroups = signal<ExaminerGroup[]>([
    { title: 'Third Party Examiners', total: 54, newCount: 41, established: 13 },
    { title: 'State Examiners', total: 21, newCount: 12, established: 9 },
  ]);

  protected readonly inspectionResults = signal<ChartDatum[]>([
    { label: 'Satisfactory', value: 12 },
    { label: 'Unsatisfactory', value: 18 },
    { label: 'Marginal', value: 24 },
    { label: 'Good', value: 26 },
    { label: 'Excellent', value: 23 },
  ]);

  protected readonly reasonsForInspection = signal<ChartDatum[]>([
    { label: 'Follow Up', value: 10 },
    { label: 'Biennial', value: 15 },
    { label: 'Investigate', value: 22 },
    { label: 'High P/F', value: 24 },
    { label: 'Overt', value: 21 },
    { label: 'Covert', value: 28 },
  ]);

  protected readonly activityRows = signal<ActivityRow[]>([
    {
      subjectName: 'Example Name',
      nextDue: '03-21-26',
      priority: 93,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Scheduled',
      inspectionType: 'Overt',
    },
    {
      subjectName: 'Example Name',
      nextDue: '03-21-26',
      priority: 97,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Planned',
      inspectionType: 'Overt',
    },
    {
      subjectName: 'Example Name',
      nextDue: '03-21-26',
      priority: 98,
      inspectionReason: 'ReExamination',
      inspectionStatus: 'Scheduled',
      inspectionType: 'Covert',
    },
    {
      subjectName: 'Example Name',
      nextDue: '03-21-26',
      priority: 97,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Planned',
      inspectionType: 'Overt',
    },
    {
      subjectName: 'Example Name',
      nextDue: '03-21-26',
      priority: 98,
      inspectionReason: 'Follow Up',
      inspectionStatus: 'Scheduled',
      inspectionType: 'Covert',
    },
  ]);

  protected readonly totalExaminers = computed(() =>
    this.examinerGroups().reduce((sum, group) => sum + group.total, 0),
  );

  protected readonly totalNewExaminers = computed(() =>
    this.examinerGroups().reduce((sum, group) => sum + group.newCount, 0),
  );

  protected readonly inspectionResultsMax = computed(() =>
    Math.max(...this.inspectionResults().map((item) => item.value)),
  );

  protected readonly reasonsForInspectionMax = computed(() =>
    Math.max(...this.reasonsForInspection().map((item) => item.value)),
  );

  protected readonly collaboratorInitials = signal(['L', 'M', 'A', 'S']);
}
