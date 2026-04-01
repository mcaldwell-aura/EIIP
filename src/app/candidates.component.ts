import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import { RouterModule } from '@angular/router';
import { CANDIDATES, type CandidateRecord, type CandidateType } from './candidates.data';

type ActiveFilter = 'active' | 'all' | 'inactive';
type CandidateSortColumn = 'candidateType' | 'candidateName' | 'nextDueDate';
type SortDirection = 'asc' | 'desc';

type SortState = {
  column: CandidateSortColumn;
  direction: SortDirection;
};

@Component({
  selector: 'app-candidates',
  imports: [RouterModule, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candidates.component.html',
  styleUrl: './candidates.component.scss',
})
export class CandidatesComponent {
  protected readonly menuService = inject(NavMenuService);

  private static readonly pageSize = 50;

  protected readonly rows = signal(CANDIDATES);
  protected readonly candidateSearchTerm = signal('');
  protected readonly candidateTypeFilter = signal<CandidateType | 'all'>('all');
  protected readonly activeFilter = signal<ActiveFilter>('active');
  protected readonly currentPage = signal(1);
  protected readonly sortState = signal<SortState>({
    column: 'candidateName',
    direction: 'asc',
  });

  protected readonly filteredSortedRows = computed(() => {
    const searchTerm = this.candidateSearchTerm().trim().toLowerCase();
    const candidateTypeFilter = this.candidateTypeFilter();
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

  protected updateCandidateTypeFilter(event: Event): void {
    this.candidateTypeFilter.set(
      (event.target as HTMLSelectElement).value as CandidateType | 'all',
    );
    this.currentPage.set(1);
  }

  protected updateActiveFilter(event: Event): void {
    this.activeFilter.set((event.target as HTMLSelectElement).value as ActiveFilter);
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
}
