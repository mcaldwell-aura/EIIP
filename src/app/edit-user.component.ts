import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { USER_ROLES, type UserRole } from './users.data';
import { UserStoreService } from './user-store.service';

@Component({
  selector: 'app-edit-user',
  imports: [RouterModule, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss',
})
export class EditUserComponent {
  protected readonly menuService = inject(NavMenuService);
  private readonly route = inject(ActivatedRoute);
  private readonly userStore = inject(UserStoreService);
  protected readonly userId = this.route.snapshot.paramMap.get('userId') ?? '';
  private readonly user = computed(() => this.userStore.findUserById(this.userId));

  protected readonly roles = USER_ROLES;
  protected readonly username = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly email = signal('');
  protected readonly role = signal<UserRole>('Viewer');
  protected readonly active = signal(true);
  protected readonly saveToastVisible = signal(false);
  protected readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`.trim());
  protected readonly activeValue = computed(() => (this.active() ? 'true' : 'false'));
  protected readonly userExists = computed(() => this.user() !== null);

  constructor() {
    effect(() => {
      const user = this.user();

      if (!user) {
        return;
      }

      this.username.set(user.username);
      this.firstName.set(user.firstName);
      this.lastName.set(user.lastName);
      this.email.set(user.email);
      this.role.set(user.role);
      this.active.set(user.active);
    });
  }

  protected updateFirstName(event: Event): void {
    this.firstName.set((event.target as HTMLInputElement).value);
  }

  protected updateLastName(event: Event): void {
    this.lastName.set((event.target as HTMLInputElement).value);
  }

  protected updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  protected updateRole(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as UserRole);
  }

  protected updateActive(event: Event): void {
    this.active.set((event.target as HTMLSelectElement).value === 'true');
  }

  protected saveUser(): void {
    this.userStore.updateUser(this.userId, {
      firstName: this.firstName(),
      lastName: this.lastName(),
      email: this.email(),
      role: this.role(),
      active: this.active(),
    });

    this.saveToastVisible.set(true);

    window.setTimeout(() => {
      this.saveToastVisible.set(false);
    }, 2200);
  }
}
