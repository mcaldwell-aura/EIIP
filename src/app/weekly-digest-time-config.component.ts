import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NavMenuService } from './nav-menu.service';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { SelectModule } from 'primeng/select';
import { UnsavedChangesConfirmationModalComponent } from './unsaved-changes-confirmation-modal.component';
import { WeeklyDigestTimeService } from './weekly-digest-time.service';
import {
  DAYS_OF_WEEK,
  generateTimeOptions,
  WeeklyDigestTimeConfig,
} from './weekly-digest-time.data';

@Component({
  selector: 'app-weekly-digest-time-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    SelectModule,
    UnsavedChangesConfirmationModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './weekly-digest-time-config.component.html',
  styleUrl: './weekly-digest-time-config.component.scss',
})
export class WeeklyDigestTimeConfigComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly service = inject(WeeklyDigestTimeService);
  private readonly router = inject(Router);

  protected readonly daysOfWeek = DAYS_OF_WEEK;
  protected readonly timeOptions = generateTimeOptions();

  protected readonly currentConfig = signal<WeeklyDigestTimeConfig>(this.service.getConfig());

  protected readonly selectedDay = signal<string>(this.currentConfig().dayOfWeek);
  protected readonly selectedTime = signal<string>(this.currentConfig().sendTime);

  protected readonly isDirty = computed(() => {
    const original = this.currentConfig();
    return this.selectedDay() !== original.dayOfWeek || this.selectedTime() !== original.sendTime;
  });

  protected readonly showUnsavedModal = signal<boolean>(false);
  private pendingNavigation: string | null = null;

  constructor() {
    // Listen for route changes to detect navigation attempts
    // This will be handled by canDeactivate guard approach in routing
  }

  protected onSave(): void {
    const newConfig: WeeklyDigestTimeConfig = {
      dayOfWeek: this.selectedDay() as any,
      sendTime: this.selectedTime(),
    };
    this.service.updateConfig(newConfig);
    this.currentConfig.set(newConfig);
  }

  protected onNavigationAttempt(destination: string): void {
    if (this.isDirty()) {
      this.pendingNavigation = destination;
      this.showUnsavedModal.set(true);
    } else {
      this.router.navigateByUrl(destination);
    }
  }

  protected onSaveFromModal(): void {
    this.onSave();
    this.showUnsavedModal.set(false);
    if (this.pendingNavigation) {
      this.router.navigateByUrl(this.pendingNavigation);
    }
  }

  protected onDiscardFromModal(): void {
    this.showUnsavedModal.set(false);
    if (this.pendingNavigation) {
      this.router.navigateByUrl(this.pendingNavigation);
    }
  }

  protected onCancelFromModal(): void {
    this.showUnsavedModal.set(false);
    this.pendingNavigation = null;
  }

  protected navigateBack(): void {
    this.onNavigationAttempt('/admin/configuration');
  }
}
