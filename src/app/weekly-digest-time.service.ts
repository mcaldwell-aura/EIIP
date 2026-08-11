import { Injectable } from '@angular/core';
import { signal } from '@angular/core';
import { DEFAULT_WEEKLY_DIGEST_CONFIG, WeeklyDigestTimeConfig } from './weekly-digest-time.data';

@Injectable({ providedIn: 'root' })
export class WeeklyDigestTimeService {
  private readonly config = signal<WeeklyDigestTimeConfig>(DEFAULT_WEEKLY_DIGEST_CONFIG);

  readonly config$ = this.config.asReadonly();

  getConfig(): WeeklyDigestTimeConfig {
    return this.config();
  }

  updateConfig(newConfig: WeeklyDigestTimeConfig): void {
    this.config.set(newConfig);
  }
}
