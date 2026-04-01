import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import type { LocationRecord } from './locations.data';
import { LocationStoreService } from './location-store.service';

type LocationSortColumn = 'locationName' | 'address' | 'city' | 'county' | 'state' | 'zip';
type SortDirection = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

type SortState = {
  column: LocationSortColumn;
  direction: SortDirection;
};

@Component({
  selector: 'app-locations',
  imports: [RouterModule, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss',
})
export class LocationsComponent {
  private static readonly pageSize = 50;
  private readonly locationStore = inject(LocationStoreService);
  protected readonly menuService = inject(NavMenuService);

  protected readonly rows = this.locationStore.locations;
  protected readonly nameSearchTerm = signal('');
  protected readonly activeFilter = signal<ActiveFilter>('active');
  protected readonly currentPage = signal(1);
  protected readonly sortState = signal<SortState>({
    column: 'locationName',
    direction: 'asc',
  });

  protected readonly filteredSortedRows = computed(() => {
    const nameSearchTerm = this.nameSearchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();
    const sortState = this.sortState();

    const filtered = this.rows().filter((row) => {
      const matchesSearch =
        nameSearchTerm.length === 0 || row.locationName.toLowerCase().includes(nameSearchTerm);
      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && row.active) ||
        (activeFilter === 'inactive' && !row.active);

      return matchesSearch && matchesActive;
    });

    return [...filtered].sort((leftRow, rightRow) => {
      const result = this.compareRows(leftRow, rightRow, sortState.column);

      if (result !== 0) {
        return sortState.direction === 'asc' ? result : -result;
      }

      return leftRow.locationName.localeCompare(rightRow.locationName, undefined, {
        sensitivity: 'base',
      });
    });
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSortedRows().length / LocationsComponent.pageSize)),
  );

  protected readonly pagedRows = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const startIndex = (page - 1) * LocationsComponent.pageSize;
    return this.filteredSortedRows().slice(startIndex, startIndex + LocationsComponent.pageSize);
  });

  protected readonly pageSummary = computed(() => {
    const totalRows = this.filteredSortedRows().length;

    if (totalRows === 0) {
      return '0 of 0';
    }

    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * LocationsComponent.pageSize + 1;
    const end = Math.min(page * LocationsComponent.pageSize, totalRows);

    return `${start}-${end} of ${totalRows}`;
  });

  protected readonly canGoToPreviousPage = computed(() => this.currentPage() > 1);
  protected readonly canGoToNextPage = computed(() => this.currentPage() < this.totalPages());

  protected updateNameSearchTerm(event: Event): void {
    this.nameSearchTerm.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  protected updateActiveFilter(event: Event): void {
    this.activeFilter.set((event.target as HTMLSelectElement).value as ActiveFilter);
    this.currentPage.set(1);
  }

  protected setSort(column: LocationSortColumn): void {
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

  protected sortIndicator(column: LocationSortColumn): string {
    if (this.sortState().column !== column) {
      return '↕';
    }

    return this.sortState().direction === 'asc' ? '↑' : '↓';
  }

  protected locationAddress(row: LocationRecord): string {
    return row.addressLine2.trim().length > 0
      ? `${row.addressLine1}, ${row.addressLine2}`
      : row.addressLine1;
  }

  protected goToPreviousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected goToNextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  private compareRows(
    leftRow: LocationRecord,
    rightRow: LocationRecord,
    column: LocationSortColumn,
  ): number {
    switch (column) {
      case 'locationName':
        return leftRow.locationName.localeCompare(rightRow.locationName, undefined, {
          sensitivity: 'base',
        });
      case 'address':
        return this.locationAddress(leftRow).localeCompare(this.locationAddress(rightRow), undefined, {
          sensitivity: 'base',
        });
      case 'city':
        return leftRow.city.localeCompare(rightRow.city, undefined, { sensitivity: 'base' });
      case 'county':
        return leftRow.county.localeCompare(rightRow.county, undefined, { sensitivity: 'base' });
      case 'state':
        return leftRow.state.localeCompare(rightRow.state, undefined, { sensitivity: 'base' });
      case 'zip':
        return leftRow.zip.localeCompare(rightRow.zip, undefined, { sensitivity: 'base' });
    }
  }
}
