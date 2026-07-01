import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavMenuService } from './nav-menu.service';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

type SubjectProfile = {
  id: string;
  displayName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  subjectStatus: 'Active' | 'Pending' | 'Inactive';
  subjectType: 'Individual' | 'Organization';
  nextDue: string;
};

type HistoryItem = {
  inspectionReason: string;
  inspectionStatus: 'Scheduled' | 'Planned';
  inspectionType: 'Overt' | 'Covert';
  completedOn: string;
};

const SUBJECTS: Record<string, SubjectProfile> = {
  'fred-johnson': {
    id: 'fred-johnson',
    displayName: 'Fred Johnson',
    firstName: 'Fred',
    middleName: 'A.',
    lastName: 'Johnson',
    subjectStatus: 'Active',
    subjectType: 'Individual',
    nextDue: '03-16-2026',
  },
  'jamie-carter': {
    id: 'jamie-carter',
    displayName: 'Jamie Carter',
    firstName: 'Jamie',
    middleName: 'L.',
    lastName: 'Carter',
    subjectStatus: 'Pending',
    subjectType: 'Individual',
    nextDue: '03-20-2026',
  },
  'andrea-banks': {
    id: 'andrea-banks',
    displayName: 'Andrea Banks',
    firstName: 'Andrea',
    middleName: 'M.',
    lastName: 'Banks',
    subjectStatus: 'Active',
    subjectType: 'Individual',
    nextDue: '03-21-2026',
  },
  'maria-ellis': {
    id: 'maria-ellis',
    displayName: 'Maria Ellis',
    firstName: 'Maria',
    middleName: 'R.',
    lastName: 'Ellis',
    subjectStatus: 'Active',
    subjectType: 'Individual',
    nextDue: '04-01-2026',
  },
  'alec-wright': {
    id: 'alec-wright',
    displayName: 'Alec Wright',
    firstName: 'Alec',
    middleName: 'J.',
    lastName: 'Wright',
    subjectStatus: 'Active',
    subjectType: 'Individual',
    nextDue: '04-03-2026',
  },
  'riley-clark': {
    id: 'riley-clark',
    displayName: 'Riley Clark',
    firstName: 'Riley',
    middleName: 'P.',
    lastName: 'Clark',
    subjectStatus: 'Active',
    subjectType: 'Individual',
    nextDue: '03-30-2026',
  },
  'devon-mills': {
    id: 'devon-mills',
    displayName: 'Devon Mills',
    firstName: 'Devon',
    middleName: 'K.',
    lastName: 'Mills',
    subjectStatus: 'Pending',
    subjectType: 'Individual',
    nextDue: '04-05-2026',
  },
  'noah-brooks': {
    id: 'noah-brooks',
    displayName: 'Noah Brooks',
    firstName: 'Noah',
    middleName: 'T.',
    lastName: 'Brooks',
    subjectStatus: 'Inactive',
    subjectType: 'Individual',
    nextDue: '04-17-2026',
  },
  'taylor-owens': {
    id: 'taylor-owens',
    displayName: 'Taylor Owens',
    firstName: 'Taylor',
    middleName: 'C.',
    lastName: 'Owens',
    subjectStatus: 'Pending',
    subjectType: 'Organization',
    nextDue: '04-14-2026',
  },
  'example-name': {
    id: 'example-name',
    displayName: 'Example Name',
    firstName: 'Jane',
    middleName: 'Good',
    lastName: 'Doe',
    subjectStatus: 'Active',
    subjectType: 'Individual',
    nextDue: '03-16-2026',
  },
};

@Component({
  selector: 'app-subject-details',
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subject-details.component.html',
  styleUrl: './subject-details.component.scss',
})
export class SubjectDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly menuService = inject(NavMenuService);
  private readonly paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  protected readonly activeTab = signal<'summary' | 'history'>(
    this.route.snapshot.queryParamMap.get('tab') === 'history' ? 'history' : 'summary',
  );

  protected readonly subjectId = computed(() => this.paramMap().get('subjectId') ?? 'example-name');

  protected readonly subject = computed<SubjectProfile>(() => {
    const found = SUBJECTS[this.subjectId()];
    return found ?? SUBJECTS['example-name'];
  });

  protected readonly history = signal<HistoryItem[]>([
    {
      inspectionReason: 'ReExam Inspection',
      inspectionStatus: 'Scheduled',
      inspectionType: 'Overt',
      completedOn: '05-14-2026',
    },
    {
      inspectionReason: 'ReExam Inspection',
      inspectionStatus: 'Planned',
      inspectionType: 'Overt',
      completedOn: '05-14-2026',
    },
    {
      inspectionReason: 'ReExam Inspection',
      inspectionStatus: 'Scheduled',
      inspectionType: 'Covert',
      completedOn: '05-14-2026',
    },
    {
      inspectionReason: 'ReExam Inspection',
      inspectionStatus: 'Scheduled',
      inspectionType: 'Overt',
      completedOn: '05-14-2026',
    },
  ]);

  protected showSummary(): void {
    this.activeTab.set('summary');
  }

  protected showHistory(): void {
    this.activeTab.set('history');
  }
}
