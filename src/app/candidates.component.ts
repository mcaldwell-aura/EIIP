import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavMenuService } from './nav-menu.service';
import { Router, RouterModule } from '@angular/router';
import { CandidateStoreService } from './candidate-store.service';
import { type CandidateRecord, type CandidateType, type NameSuffix } from './candidates.data';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

type ActiveFilter = 'active' | 'all' | 'inactive';
type CandidateSortColumn = 'candidateType' | 'candidateName' | 'nextDueDate';
type SortDirection = 'asc' | 'desc';

type SortState = {
  column: CandidateSortColumn;
  direction: SortDirection;
};

@Component({
  selector: 'app-candidates',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DialogModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TableModule,
    ToastModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candidates.component.html',
  styleUrl: './candidates.component.scss',
})
export class CandidatesComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly candidateStore = inject(CandidateStoreService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  private static readonly pageSize = 50;
  private static readonly nameSuffixes: NameSuffix[] = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

  protected readonly rows = this.candidateStore.candidates;
  protected readonly candidateSearchTerm = signal('');
  protected readonly candidateTypeFilterValue = signal<CandidateType | 'all'>('all');
  protected readonly candidateTypeOptions = [
    { label: 'Candidate Type: All', value: 'all' },
    { label: 'Candidate Type: Individual', value: 'Individual' },
    { label: 'Candidate Type: Organization', value: 'Organization' },
  ];
  protected readonly activeFilter = signal<ActiveFilter>('active');
  protected readonly activeFilterOptions = [
    { label: 'Status: Active', value: 'active' },
    { label: 'Status: All', value: 'all' },
    { label: 'Status: Inactive', value: 'inactive' },
  ];
  protected readonly currentPage = signal(1);
  protected readonly sortState = signal<SortState>({
    column: 'candidateName',
    direction: 'asc',
  });
  protected readonly hasManageCandidatesPermission = true;

  protected readonly newCandidateDialogVisible = signal(false);
  protected readonly newCandidateCandidateType = signal<CandidateType>('Individual');
  protected readonly newCandidateFirstName = signal('');
  protected readonly newCandidateMiddleName = signal('');
  protected readonly newCandidateLastName = signal('');
  protected readonly newCandidateSuffix = signal<NameSuffix | ''>('');
  protected readonly newCandidateOrganizationName = signal('');
  protected readonly newCandidateNextDueDate = signal('');
  protected readonly newCandidateExternalIdentifier = signal('');
  protected readonly newCandidateStartDate = signal(this.todayIsoDate());
  protected readonly newCandidateEndDate = signal('');
  protected readonly newCandidateValidationMessage = signal('');

  protected readonly nameSuffixOptions = CandidatesComponent.nameSuffixes.map((suffix) => ({
    label: suffix,
    value: suffix,
  }));
  protected readonly candidateTypeModalOptions = [
    { label: 'Individual', value: 'Individual' },
    { label: 'Organization', value: 'Organization' },
  ];

  protected readonly showNewCandidateIndividualFields = computed(
    () => this.newCandidateCandidateType() === 'Individual',
  );
  protected readonly showNewCandidateOrganizationFields = computed(
    () => this.newCandidateCandidateType() === 'Organization',
  );

  protected readonly filteredSortedRows = computed(() => {
    const searchTerm = this.candidateSearchTerm().trim().toLowerCase();
    const candidateTypeFilter = this.candidateTypeFilterValue();
    const activeFilter = this.activeFilter();
    const sortState = this.sortState();

    const filtered = this.rows().filter((row) => {
      const isActive = this.isActiveCandidate(row.endDate);
      const searchHaystack = [
        this.candidateDisplayName(row).toLowerCase(),
        row.candidateType.toLowerCase(),
        isActive ? 'active' : 'inactive',
      ].join(' ');
      const matchesSearch = searchTerm.length === 0 || searchHaystack.includes(searchTerm);
      const matchesType =
        candidateTypeFilter === 'all' || row.candidateType === candidateTypeFilter;
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && isActive) ||
        (activeFilter === 'inactive' && !isActive);

      return matchesSearch && matchesType && matchesActive;
    });

    return [...filtered].sort((leftRow, rightRow) => {
      const result = this.compareRows(leftRow, rightRow, sortState.column);

      if (result !== 0) {
        return sortState.direction === 'asc' ? result : -result;
      }

      return this.candidateDisplayName(leftRow).localeCompare(
        this.candidateDisplayName(rightRow),
        undefined,
        {
          sensitivity: 'base',
        },
      );
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSortedRows().length / CandidatesComponent.pageSize)),
  );

  protected readonly pagedRows = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const startIndex = (page - 1) * CandidatesComponent.pageSize;
    return this.filteredSortedRows().slice(startIndex, startIndex + CandidatesComponent.pageSize);
  });

  protected readonly pageSummary = computed(() => {
    const totalRows = this.filteredSortedRows().length;

    if (totalRows === 0) {
      return '0 of 0';
    }

    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * CandidatesComponent.pageSize + 1;
    const end = Math.min(page * CandidatesComponent.pageSize, totalRows);

    return `${start}-${end} of ${totalRows}`;
  });

  protected readonly canGoToPreviousPage = computed(() => this.currentPage() > 1);
  protected readonly canGoToNextPage = computed(() => this.currentPage() < this.totalPages());

  protected updateCandidateSearchTerm(event: Event): void {
    this.candidateSearchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected updateCandidateTypeFilter(value: CandidateType | 'all'): void {
    this.candidateTypeFilterValue.set(value);
    this.currentPage.set(1);
  }

  protected updateActiveFilter(value: ActiveFilter): void {
    this.activeFilter.set(value);
    this.currentPage.set(1);
  }

  protected setSort(column: CandidateSortColumn): void {
    this.sortState.update((current) => {
      if (current.column !== column) {
        return { column, direction: 'asc' };
      }

      return {
        column,
        direction: current.direction === 'asc' ? 'desc' : 'asc',
      };
    });
  }

  protected sortIndicator(column: CandidateSortColumn): string {
    const sortState = this.sortState();

    if (sortState.column !== column) {
      return '↕';
    }

    return sortState.direction === 'asc' ? '↑' : '↓';
  }

  protected goToPreviousPage(): void {
    if (!this.canGoToPreviousPage()) {
      return;
    }

    this.currentPage.update((page) => page - 1);
  }

  protected goToNextPage(): void {
    if (!this.canGoToNextPage()) {
      return;
    }

    this.currentPage.update((page) => page + 1);
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'NULL';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  protected candidateDisplayName(row: CandidateRecord): string {
    return row.candidateType === 'Individual'
      ? (row.firstMiddleLast ?? '—')
      : (row.organizationName ?? '—');
  }

  protected candidateTypeIcon(row: CandidateRecord): string {
    return row.candidateType === 'Individual' ? '👤' : '🏢';
  }

  protected candidateTypeTooltip(row: CandidateRecord): string {
    return row.candidateType;
  }

  protected openNewCandidateDialog(): void {
    this.resetNewCandidateForm();
    this.newCandidateDialogVisible.set(true);
  }

  protected cancelNewCandidate(): void {
    this.newCandidateDialogVisible.set(false);
    this.resetNewCandidateForm();
  }

  protected saveNewCandidate(): void {
    if (!this.validateNewCandidateForm()) {
      return;
    }

    const createdCandidate = this.candidateStore.addCandidate({
      candidateType: this.newCandidateCandidateType(),
      firstName: this.newCandidateFirstName(),
      middleName: this.newCandidateMiddleName(),
      lastName: this.newCandidateLastName(),
      suffix: this.newCandidateSuffix() || null,
      organizationName: this.newCandidateOrganizationName(),
      nextDueDate: this.newCandidateNextDueDate() || null,
      externalIdentifier: this.newCandidateExternalIdentifier(),
      startDate: this.newCandidateStartDate(),
      endDate: this.newCandidateEndDate() || null,
    });

    this.newCandidateDialogVisible.set(false);
    this.resetNewCandidateForm();

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Candidate saved successfully.',
      life: 2200,
    });

    void this.router.navigate(['/candidates', createdCandidate.candidateId], {
      state: {
        candidateSaved: true,
      },
    });
  }

  private compareRows(
    leftRow: CandidateRecord,
    rightRow: CandidateRecord,
    column: CandidateSortColumn,
  ): number {
    if (column === 'nextDueDate') {
      return this.dateValue(leftRow[column]) - this.dateValue(rightRow[column]);
    }

    if (column === 'candidateName') {
      return this.candidateDisplayName(leftRow).localeCompare(
        this.candidateDisplayName(rightRow),
        undefined,
        {
          sensitivity: 'base',
        },
      );
    }

    return leftRow[column].localeCompare(rightRow[column], undefined, {
      sensitivity: 'base',
    });
  }

  private dateValue(value: string | null): number {
    if (!value) {
      return Number.POSITIVE_INFINITY;
    }

    return Date.parse(value);
  }

  private isActiveCandidate(endDate: string | null): boolean {
    if (!endDate) {
      return true;
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Date.parse(endDate) >= startOfToday.getTime();
  }

  private validateNewCandidateForm(): boolean {
    this.newCandidateValidationMessage.set('');

    const candidateType = this.newCandidateCandidateType();
    const firstName = this.newCandidateFirstName().trim();
    const middleName = this.newCandidateMiddleName().trim();
    const lastName = this.newCandidateLastName().trim();
    const organizationName = this.newCandidateOrganizationName().trim();
    const externalIdentifier = this.newCandidateExternalIdentifier().trim();
    const startDate = this.newCandidateStartDate().trim();
    const endDate = this.newCandidateEndDate().trim();
    const today = this.todayIsoDate();

    if (candidateType === 'Individual') {
      if (firstName.length === 0) {
        this.newCandidateValidationMessage.set('First Name is required.');
        return false;
      }

      if (firstName.length > 50) {
        this.newCandidateValidationMessage.set('First Name must be 50 characters or fewer.');
        return false;
      }

      if (middleName.length > 50) {
        this.newCandidateValidationMessage.set('Middle Name must be 50 characters or fewer.');
        return false;
      }

      if (lastName.length === 0) {
        this.newCandidateValidationMessage.set('Last Name is required.');
        return false;
      }

      if (lastName.length > 70) {
        this.newCandidateValidationMessage.set('Last Name must be 70 characters or fewer.');
        return false;
      }
    }

    if (candidateType === 'Organization') {
      if (organizationName.length === 0) {
        this.newCandidateValidationMessage.set('Organization Name is required.');
        return false;
      }

      if (organizationName.length > 256) {
        this.newCandidateValidationMessage.set(
          'Organization Name must be 256 characters or fewer.',
        );
        return false;
      }
    }

    if (externalIdentifier.length > 256) {
      this.newCandidateValidationMessage.set(
        'External Identifier must be 256 characters or fewer.',
      );
      return false;
    }

    if (startDate.length === 0) {
      this.newCandidateValidationMessage.set('Start Date is required.');
      return false;
    }

    if (startDate > today) {
      this.newCandidateValidationMessage.set('Start Date cannot be in the future.');
      return false;
    }

    if (endDate.length > 0 && endDate < startDate) {
      this.newCandidateValidationMessage.set('End Date cannot be before Start Date.');
      return false;
    }

    return true;
  }

  private resetNewCandidateForm(): void {
    this.newCandidateCandidateType.set('Individual');
    this.newCandidateFirstName.set('');
    this.newCandidateMiddleName.set('');
    this.newCandidateLastName.set('');
    this.newCandidateSuffix.set('');
    this.newCandidateOrganizationName.set('');
    this.newCandidateNextDueDate.set('');
    this.newCandidateExternalIdentifier.set('');
    this.newCandidateStartDate.set(this.todayIsoDate());
    this.newCandidateEndDate.set('');
    this.newCandidateValidationMessage.set('');
  }

  private todayIsoDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = `${today.getMonth() + 1}`.padStart(2, '0');
    const day = `${today.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
