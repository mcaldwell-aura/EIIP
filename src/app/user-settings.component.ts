import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavMenuService } from './nav-menu.service';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

type UserSettingsTabId = 'profile' | 'notifications';

type NotificationTypeId =
  | 'assignment-changes'
  | 'inspection-status-changes'
  | 'appointment-status-changes'
  | 'weekly-summaries';

type UserSettingsTab = {
  id: UserSettingsTabId;
  label: string;
};

type NotificationTypeOption = {
  id: NotificationTypeId;
  label: string;
};

@Component({
  selector: 'app-user-settings',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    ToastModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-settings.component.html',
  styleUrl: './user-settings.component.scss',
})
export class UserSettingsComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly tabs: readonly UserSettingsTab[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'notifications', label: 'Notifications' },
  ];

  protected readonly activeTab = signal<UserSettingsTabId>('profile');
  protected readonly username = signal('mcaldwell@aurasolutionsllc.com');
  protected readonly firstName = signal('Mya');
  protected readonly lastName = signal('Caldwell');
  protected readonly contactEmail = signal('mcaldwell@aurasolutionsllc.com');
  protected readonly contactPhone = signal('(555) 555-5555');
  protected readonly allowNotifications = signal(true);
  protected readonly notificationTypes: readonly NotificationTypeOption[] = [
    {
      id: 'assignment-changes',
      label: 'Assignment changes to my assigned inspections',
    },
    {
      id: 'inspection-status-changes',
      label: 'Status changes to my assigned inspections',
    },
    {
      id: 'appointment-status-changes',
      label: 'Status changes to my inspection appointments',
    },
    {
      id: 'weekly-summaries',
      label: 'Weekly summaries',
    },
  ];
  protected readonly notificationSelections = signal<Record<NotificationTypeId, boolean>>({
    'assignment-changes': true,
    'inspection-status-changes': true,
    'appointment-status-changes': true,
    'weekly-summaries': true,
  });
  private readonly applyRequestedTab = effect(() => {
    const requestedTab = this.queryParamMap().get('tab');

    if (requestedTab === 'profile' || requestedTab === 'notifications') {
      this.activeTab.set(requestedTab);
    }
  });

  protected setActiveTab(tabId: UserSettingsTabId): void {
    this.activeTab.set(tabId);
  }

  protected updateContactEmail(event: Event): void {
    this.contactEmail.set((event.target as HTMLInputElement).value);
  }

  protected updateContactPhone(event: Event): void {
    this.contactPhone.set((event.target as HTMLInputElement).value);
  }

  protected saveProfile(): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Profile settings saved successfully.',
      life: 3000,
    });
  }

  protected setAllowNotifications(enabled: boolean): void {
    this.allowNotifications.set(enabled);

    this.notificationSelections.update((current) => ({
      ...current,
      'assignment-changes': enabled,
      'inspection-status-changes': enabled,
      'appointment-status-changes': enabled,
      'weekly-summaries': enabled,
    }));
  }

  protected onAllowNotificationsChange(event: Event): void {
    this.setAllowNotifications((event.target as HTMLInputElement).checked);
  }

  protected isNotificationTypeEnabled(typeId: NotificationTypeId): boolean {
    return this.notificationSelections()[typeId];
  }

  protected setNotificationTypeEnabled(typeId: NotificationTypeId, enabled: boolean): void {
    if (!this.allowNotifications()) {
      return;
    }

    this.notificationSelections.update((current) => ({
      ...current,
      [typeId]: enabled,
    }));
  }

  protected onNotificationTypeChange(typeId: NotificationTypeId, event: Event): void {
    this.setNotificationTypeEnabled(typeId, (event.target as HTMLInputElement).checked);
  }

  protected saveNotifications(): void {
    const email = this.contactEmail().trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailPattern.test(email)) {
      return;
    }

    this.messageService.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Notification settings saved successfully.',
      life: 3000,
    });
  }
}
