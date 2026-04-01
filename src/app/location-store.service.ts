import { computed, Injectable, signal } from '@angular/core';
import { LOCATIONS, type LocationRecord } from './locations.data';

export type LocationUpdateInput = {
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

@Injectable({ providedIn: 'root' })
export class LocationStoreService {
  private readonly allLocations = signal<LocationRecord[]>([...LOCATIONS]);

  readonly locations = computed(() => this.allLocations());

  findLocationById(locationId: string): LocationRecord | undefined {
    return this.allLocations().find((location) => location.locationId === locationId);
  }

  updateLocation(locationId: string, updates: LocationUpdateInput): LocationRecord | undefined {
    let updatedLocation: LocationRecord | undefined;

    this.allLocations.update((locations) =>
      locations.map((location) => {
        if (location.locationId !== locationId) {
          return location;
        }

        updatedLocation = {
          ...location,
          ...updates,
        };

        return updatedLocation;
      }),
    );

    return updatedLocation;
  }
}
