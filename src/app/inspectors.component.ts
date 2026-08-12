import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NavMenuService } from './nav-menu.service';
import { INSPECTORS, type InspectorRecord } from './inspectors.data';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

type InspectorSearchParams = {
  inspectorName: string;
  region: string;
  active: boolean;
};

const DEFAULT_SEARCH_PARAMS: InspectorSearchParams = {
  inspectorName: '',
  region: 'all',
  active: true,
};

@Component({
  selector: 'app-inspectors',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    SelectModule,
    TableModule,
    ToggleSwitchModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspectors.component.html',
  styleUrl: './inspectors.component.scss',
})
export class InspectorsComponent {
  protected readonly menuService = inject(NavMenuService);

  protected readonly rows = signal<InspectorRecord[]>([...INSPECTORS]);

  protected readonly searchParams = signal<InspectorSearchParams>({ ...DEFAULT_SEARCH_PARAMS });
  protected readonly appliedParams = signal<InspectorSearchParams>({ ...DEFAULT_SEARCH_PARAMS });

  protected readonly regionOptions = computed(() => {
    const regionSet = new Set(this.rows().map((row) => row.region));
    const sortedRegions = Array.from(regionSet).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: 'base' }),
    );

    return [
      { label: 'All Regions', value: 'all' },
      ...sortedRegions.map((region) => ({
        label: region,
        value: region,
      })),
    ];
  });

  protected readonly filteredRows = computed(() => {
    const { inspectorName, region, active } = this.appliedParams();
    const normalizedInspectorName = inspectorName.trim().toLowerCase();

    return this.rows().filter((row) => {
      const matchesName =
        normalizedInspectorName.length === 0 ||
        row.name.toLowerCase().includes(normalizedInspectorName);
      const matchesRegion = region === 'all' || row.region === region;
      const matchesActive = row.active === active;

      return matchesName && matchesRegion && matchesActive;
    });
  });

  protected updateInspectorName(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.patchSearchParams({ inspectorName: value });
  }

  protected updateRegion(value: string): void {
    this.patchSearchParams({ region: value });
  }

  protected updateActive(value: boolean): void {
    this.patchSearchParams({ active: value });
  }

  protected reset(): void {
    this.searchParams.set({ ...DEFAULT_SEARCH_PARAMS });
    this.appliedParams.set({ ...DEFAULT_SEARCH_PARAMS });
  }

  protected search(): void {
    this.appliedParams.set({ ...this.searchParams() });
  }

  protected activeLabel(isActive: boolean): string {
    return isActive ? 'Yes' : 'No';
  }

  protected formatLastInspectionDate(value: string | null): string {
    if (!value) {
      return 'Not Set';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  private patchSearchParams(partial: Partial<InspectorSearchParams>): void {
    this.searchParams.update((current) => ({
      ...current,
      ...partial,
    }));
  }
}
