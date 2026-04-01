import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import { USER_ROLES, type UserRecord, type UserRole } from './users.data';
import { UserStoreService } from './user-store.service';

type UserSortColumn = 'firstName' | 'lastName' | 'role' | 'active';
type SortDirection = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

type SortState = {
  column: UserSortColumn;
  direction: SortDirection;
};

@Component({
  selector: 'app-users',
  imports: [RouterModule, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent {
  private static readonly pageSize = 50;
  private readonly userStore = inject(UserStoreService);
  protected readonly menuService = inject(NavMenuService);

  protected readonly rows = this.userStore.users;
  protected readonly userSearchTerm = signal('');
  protected readonly roleFilter = signal<UserRole | 'all'>('all');
  protected readonly activeFilter = signal<ActiveFilter>('all');
  protected readonly currentPage = signal(1);
  protected readonly sortState = signal<SortState>({
    column: 'lastName',
    direction: 'asc',
  });

  protected readonly roles = USER_ROLES;

  protected readonly filteredSortedRows = computed(() => {
    const userSearchTerm = this.userSearchTerm().trim().toLowerCase();
    const roleFilter = this.roleFilter();
    const activeFilter = this.activeFilter();
    const sortState = this.sortState();

    const filtered = this.rows().filter((row) => {
      const fullName = `${row.firstName} ${row.lastName}`.toLowerCase();
      const matchesSearch =
        userSearchTerm.length === 0 ||
        row.firstName.toLowerCase().includes(userSearchTerm) ||
        row.lastName.toLowerCase().includes(userSearchTerm) ||
        fullName.includes(userSearchTerm);
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && row.active) ||
        (activeFilter === 'inactive' && !row.active);

      return matchesSearch && matchesRole && matchesActive;
    });

    return [...filtered].sort((leftRow, rightRow) => {
      const result = this.compareRows(leftRow, rightRow, sortState.column);

      if (result !== 0) {
        return sortState.direction === 'asc' ? result : -result;
      }

      const byLastName = leftRow.lastName.localeCompare(rightRow.lastName, undefined, {
        sensitivity: 'base',
      });

      if (byLastName !== 0) {
        return byLastName;
      }

      return leftRow.firstName.localeCompare(rightRow.firstName, undefined, {
        sensitivity: 'base',
      });
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSortedRows().length / UsersComponent.pageSize)),
  );

  protected readonly pagedRows = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const startIndex = (page - 1) * UsersComponent.pageSize;
    return this.filteredSortedRows().slice(startIndex, startIndex + UsersComponent.pageSize);
  });

  protected readonly pageSummary = computed(() => {
    const totalRows = this.filteredSortedRows().length;

    if (totalRows === 0) {
      return '0 of 0';
    }

    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * UsersComponent.pageSize + 1;
    const end = Math.min(page * UsersComponent.pageSize, totalRows);

    return `${start}-${end} of ${totalRows}`;
  });

  protected readonly canGoToPreviousPage = computed(() => this.currentPage() > 1);
  protected readonly canGoToNextPage = computed(() => this.currentPage() < this.totalPages());

  protected updateUserSearchTerm(event: Event): void {
    this.userSearchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected updateRoleFilter(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as UserRole | 'all');
    this.currentPage.set(1);
  }

  protected updateActiveFilter(event: Event): void {
    this.activeFilter.set((event.target as HTMLSelectElement).value as ActiveFilter);
    this.currentPage.set(1);
  }

  protected setSort(column: UserSortColumn): void {
    this.sortState.update((current) => {
      if (current.column === column) {
        return {
          column,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        column,
        direction: 'asc',
      };
    });
  }

  protected sortIndicator(column: UserSortColumn): string {
    if (this.sortState().column !== column) {
      return '↕';
    }

    return this.sortState().direction === 'asc' ? '↑' : '↓';
  }

  protected activeLabel(active: boolean): string {
    return active ? 'Yes' : 'No';
  }

  protected goToPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  private compareRows(leftRow: UserRecord, rightRow: UserRecord, column: UserSortColumn): number {
    switch (column) {
      case 'firstName':
        return leftRow.firstName.localeCompare(rightRow.firstName, undefined, {
          sensitivity: 'base',
        });
      case 'lastName':
        return leftRow.lastName.localeCompare(rightRow.lastName, undefined, {
          sensitivity: 'base',
        });
      case 'role':
        return leftRow.role.localeCompare(rightRow.role, undefined, { sensitivity: 'base' });
      case 'active':
        return Number(leftRow.active) - Number(rightRow.active);
    }
  }
}
