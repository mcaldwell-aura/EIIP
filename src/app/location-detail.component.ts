import { CommonModule, Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavMenuService } from './nav-menu.service';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ARIZONA_COUNTIES, STATES, type LocationRecord, type StateOption } from './locations.data';
import { LocationStoreService } from './location-store.service';

import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TagModule } from 'primeng/tag';

type LocationDetailForm = {
  locationName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  externalIdentifier: string;
  active: boolean;
};

@Component({
  selector: 'app-location-detail',
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
    TagModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './location-detail.component.html',
  styleUrl: './location-detail.component.scss',
})
export class LocationDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly browserLocation = inject(Location);
  private readonly locationStore = inject(LocationStoreService);
  protected readonly menuService = inject(NavMenuService);

  protected readonly states = STATES;
  protected readonly counties = ARIZONA_COUNTIES;
  protected readonly locationId = signal('');
  protected readonly form = signal<LocationDetailForm>({
    locationName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    county: '',
    state: 'AZ',
    zip: '',
    externalIdentifier: '',
    active: true,
  });
  protected readonly saveToastVisible = signal(false);
  protected readonly validationErrorMessage = signal('');
  protected readonly selectedTab = signal<'summary'>('summary');

  // Mock permission; replace with auth/permission service when available.
  protected readonly hasManageLocationsPermission = signal(true);
  protected readonly canEdit = computed(() => this.hasManageLocationsPermission());
  protected readonly locationName = computed(() => this.form().locationName || 'Location');
  protected readonly headerStatusLabel = computed(() =>
    this.form().active ? 'Active' : 'Not Active',
  );
  protected readonly headerStatusClass = computed(() =>
    this.form().active ? 'location-status-active' : 'location-status-inactive',
  );
  protected readonly headerAddressLine1 = computed(() => this.form().addressLine1.trim());
  protected readonly headerAddressLine2 = computed(() => this.form().addressLine2.trim());
  protected readonly headerAddressFinalLine = computed(() => {
    const values = this.form();
    const cityCounty = [values.city.trim(), values.county.trim()]
      .filter((part) => part.length > 0)
      .join(', ');
    const stateZip = `${values.state.trim()} ${values.zip.trim()}`.trim();

    return [cityCounty, stateZip].filter((part) => part.length > 0).join(', ');
  });

  constructor() {
    const navState = this.router.getCurrentNavigation()?.extras.state;
    if (navState?.['locationSaved'] === true) {
      this.saveToastVisible.set(true);
      setTimeout(() => {
        this.saveToastVisible.set(false);
      }, 3000);
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('locationId');

      if (!id) {
        this.router.navigate(['/locations']);
        return;
      }

      this.locationId.set(id);
      this.loadLocation(id);
    });
  }

  protected goBack(): void {
    this.browserLocation.back();
  }

  protected updateField<K extends keyof LocationDetailForm>(
    key: K,
    value: LocationDetailForm[K],
  ): void {
    this.form.update((current) => ({
      ...current,
      [key]: value,
    }));
  }

  protected updateZip(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D+/g, '').slice(0, 5);
    this.updateField('zip', digitsOnly);
  }

  protected updateLocationName(event: Event): void {
    this.updateField('locationName', (event.target as HTMLInputElement).value);
  }

  protected updateAddressLine1(event: Event): void {
    this.updateField('addressLine1', (event.target as HTMLInputElement).value);
  }

  protected updateAddressLine2(event: Event): void {
    this.updateField('addressLine2', (event.target as HTMLInputElement).value);
  }

  protected updateCity(event: Event): void {
    this.updateField('city', (event.target as HTMLInputElement).value);
  }

  protected updateCounty(event: Event): void {
    this.updateField('county', (event.target as HTMLSelectElement).value);
  }

  protected updateState(event: Event): void {
    this.updateField('state', (event.target as HTMLSelectElement).value);
  }

  protected updateExternalIdentifier(event: Event): void {
    this.updateField('externalIdentifier', (event.target as HTMLInputElement).value);
  }

  protected toggleActive(event: Event): void {
    this.updateField('active', (event.target as HTMLInputElement).checked);
  }

  protected saveLocation(): void {
    if (!this.canEdit()) {
      return;
    }

    this.validationErrorMessage.set('');

    const values = this.form();

    if (!values.locationName.trim()) {
      this.validationErrorMessage.set('Location Name is required.');
      return;
    }

    if (!values.addressLine1.trim()) {
      this.validationErrorMessage.set('Address Line 1 is required.');
      return;
    }

    if (!values.city.trim()) {
      this.validationErrorMessage.set('City is required.');
      return;
    }

    if (!values.state.trim()) {
      this.validationErrorMessage.set('State is required.');
      return;
    }

    if (!values.zip.trim()) {
      this.validationErrorMessage.set('ZIP is required.');
      return;
    }

    if (!/^\d{1,5}$/.test(values.zip)) {
      this.validationErrorMessage.set('ZIP must contain only digits up to 5 characters.');
      return;
    }

    const overLimit = [
      values.locationName,
      values.addressLine1,
      values.addressLine2,
      values.city,
      values.externalIdentifier,
    ].some((value) => value.length > 256);

    if (overLimit) {
      this.validationErrorMessage.set('Text fields must not exceed 256 characters.');
      return;
    }

    this.locationStore.updateLocation(this.locationId(), {
      locationName: values.locationName.trim(),
      addressLine1: values.addressLine1.trim(),
      addressLine2: values.addressLine2.trim(),
      city: values.city.trim(),
      county: values.county,
      state: values.state,
      zip: values.zip,
      externalIdentifier: values.externalIdentifier.trim(),
      active: values.active,
    });

    this.saveToastVisible.set(true);
    setTimeout(() => this.saveToastVisible.set(false), 3000);
  }

  protected stateTrackBy(option: StateOption): string {
    return option.abbreviation;
  }

  private loadLocation(locationId: string): void {
    const location = this.locationStore.findLocationById(locationId);

    if (!location) {
      this.router.navigate(['/locations']);
      return;
    }

    this.form.set(this.toFormValue(location));
  }

  private toFormValue(location: LocationRecord): LocationDetailForm {
    return {
      locationName: location.locationName,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      county: location.county,
      state: location.state || 'AZ',
      zip: location.zip,
      externalIdentifier: location.externalIdentifier,
      active: location.active,
    };
  }
}
