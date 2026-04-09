import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NavMenuService } from './nav-menu.service';
import { ARIZONA_COUNTIES, STATES, type LocationRecord } from './locations.data';
import { LocationStoreService } from './location-store.service';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';

type LocationSortColumn = 'locationName' | 'address' | 'city' | 'county' | 'state' | 'zip';
type SortDirection = 'asc' | 'desc';
type ActiveFilter = 'all' | 'active' | 'inactive';

type SortState = {
  column: LocationSortColumn;
  direction: SortDirection;
};

@Component({
  selector: 'app-locations',
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
    ToggleSwitchModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './locations.component.html',
  styleUrl: './locations.component.scss',
})
export class LocationsComponent {
  private static readonly pageSize = 50;
  private readonly locationStore = inject(LocationStoreService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  protected readonly menuService = inject(NavMenuService);

  protected readonly rows = this.locationStore.locations;
  protected readonly nameSearchTerm = signal('');
  protected readonly activeFilterOptions = [
    { label: 'Status: Active', value: 'active' },
    { label: 'Status: All', value: 'all' },
    { label: 'Status: Inactive', value: 'inactive' },
  ];
  protected readonly activeFilter = signal<ActiveFilter>('active');
  protected readonly currentPage = signal(1);
  protected readonly sortState = signal<SortState>({
    column: 'locationName',
    direction: 'asc',
  });

  // Mock permission; replace with auth/permission service when available.
  protected readonly hasManageLocationsPermission = true;

  // New Location modal state
  protected readonly newLocationDialogVisible = signal(false);
  protected readonly newLocationName = signal('');
  protected readonly newLocationAddressLine1 = signal('');
  protected readonly newLocationAddressLine2 = signal('');
  protected readonly newLocationCity = signal('');
  protected readonly newLocationCounty = signal('');
  protected readonly newLocationState = signal('AZ');
  protected readonly newLocationZip = signal('');
  protected readonly newLocationExternalIdentifier = signal('');
  protected readonly newLocationActive = signal(true);
  protected readonly newLocationValidationMessage = signal('');

  protected readonly stateOptions = STATES.map((s) => ({ label: s.label, value: s.abbreviation }));
  protected readonly countyOptions = ARIZONA_COUNTIES.map((c) => ({ label: c, value: c }));

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

  protected updateActiveFilter(value: ActiveFilter): void {
    this.activeFilter.set(value);
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
        return this.locationAddress(leftRow).localeCompare(
          this.locationAddress(rightRow),
          undefined,
          {
            sensitivity: 'base',
          },
        );
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

  protected openNewLocationDialog(): void {
    this.resetNewLocationForm();
    this.newLocationDialogVisible.set(true);
  }

  protected cancelNewLocation(): void {
    this.newLocationDialogVisible.set(false);
    this.resetNewLocationForm();
  }

  protected saveNewLocation(): void {
    if (!this.validateNewLocationForm()) {
      return;
    }

    const created = this.locationStore.addLocation({
      locationName: this.newLocationName().trim(),
      addressLine1: this.newLocationAddressLine1().trim(),
      addressLine2: this.newLocationAddressLine2().trim(),
      city: this.newLocationCity().trim(),
      county: this.newLocationCounty(),
      state: this.newLocationState(),
      zip: this.newLocationZip(),
      externalIdentifier: this.newLocationExternalIdentifier().trim(),
      active: this.newLocationActive(),
    });

    this.newLocationDialogVisible.set(false);
    this.resetNewLocationForm();

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Location saved successfully.',
      life: 2200,
    });

    void this.router.navigate(['/locations', created.locationId], {
      state: { locationSaved: true },
    });
  }

  protected updateNewLocationZip(event: Event): void {
    const digits = (event.target as HTMLInputElement).value.replace(/\D+/g, '').slice(0, 5);
    this.newLocationZip.set(digits);
    (event.target as HTMLInputElement).value = digits;
  }

  private validateNewLocationForm(): boolean {
    this.newLocationValidationMessage.set('');

    if (!this.newLocationName().trim()) {
      this.newLocationValidationMessage.set('Location Name is required.');
      return false;
    }

    if (!this.newLocationAddressLine1().trim()) {
      this.newLocationValidationMessage.set('Address Line 1 is required.');
      return false;
    }

    if (!this.newLocationCity().trim()) {
      this.newLocationValidationMessage.set('City is required.');
      return false;
    }

    if (!this.newLocationState()) {
      this.newLocationValidationMessage.set('State is required.');
      return false;
    }

    if (!this.newLocationZip().trim()) {
      this.newLocationValidationMessage.set('ZIP is required.');
      return false;
    }

    if (!/^\d{1,5}$/.test(this.newLocationZip())) {
      this.newLocationValidationMessage.set('ZIP must be up to 5 digits.');
      return false;
    }

    const overLimit = [
      this.newLocationName(),
      this.newLocationAddressLine1(),
      this.newLocationAddressLine2(),
      this.newLocationCity(),
      this.newLocationExternalIdentifier(),
    ].some((v) => v.length > 256);

    if (overLimit) {
      this.newLocationValidationMessage.set('Text fields must not exceed 256 characters.');
      return false;
    }

    return true;
  }

  private resetNewLocationForm(): void {
    this.newLocationName.set('');
    this.newLocationAddressLine1.set('');
    this.newLocationAddressLine2.set('');
    this.newLocationCity.set('');
    this.newLocationCounty.set('');
    this.newLocationState.set('AZ');
    this.newLocationZip.set('');
    this.newLocationExternalIdentifier.set('');
    this.newLocationActive.set(true);
    this.newLocationValidationMessage.set('');
  }
}
