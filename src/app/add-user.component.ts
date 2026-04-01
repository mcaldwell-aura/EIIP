import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import { Router, RouterModule } from '@angular/router';
import { ASSIGNABLE_USER_ROLES, type AccountRepositoryUser, type AssignableUserRole } from './users.data';
import { UserStoreService } from './user-store.service';

type AddUserStep = 'search' | 'details';

@Component({
  selector: 'app-add-user',
  imports: [RouterModule, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-user.component.html',
  styleUrl: './add-user.component.scss',
})
export class AddUserComponent {
  private readonly router = inject(Router);
  private readonly userStore = inject(UserStoreService);
  protected readonly menuService = inject(NavMenuService);
  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  protected readonly step = signal<AddUserStep>('search');
  protected readonly username = signal('');
  protected readonly matchedRepositoryUser = signal<AccountRepositoryUser | null>(null);
  protected readonly email = signal('');
  protected readonly active = signal(true);
  protected readonly role = signal<AssignableUserRole | ''>('');

  protected readonly usernameValidationMessage = signal('');
  protected readonly emailValidationMessage = signal('');
  protected readonly roleValidationMessage = signal('');
  protected readonly errorToastMessage = signal('');
  protected readonly successToastVisible = signal(false);

  protected readonly assignableRoles = ASSIGNABLE_USER_ROLES;
  protected readonly activeChecked = computed(() => this.active());
  protected readonly matchedUsername = computed(() => this.matchedRepositoryUser()?.username ?? '');
  protected readonly matchedFirstName = computed(() => this.matchedRepositoryUser()?.firstName ?? '');
  protected readonly matchedLastName = computed(() => this.matchedRepositoryUser()?.lastName ?? '');
  protected readonly showSearchStep = computed(() => this.step() === 'search');
  protected readonly showDetailsStep = computed(() => this.step() === 'details');
  protected readonly showErrorToast = computed(() => this.errorToastMessage().length > 0);

  protected updateUsername(event: Event): void {
    this.username.set((event.target as HTMLInputElement).value);
    this.usernameValidationMessage.set('');
  }

  protected searchUser(): void {
    const username = this.username().trim();
    this.usernameValidationMessage.set('');
    this.clearErrorToast();

    if (username.length === 0) {
      this.usernameValidationMessage.set('Username is required');
      return;
    }

    if (this.userStore.usernameExists(username)) {
      this.showError('A user with this username already exists.');
      return;
    }

    const matchedUser = this.userStore.findRepositoryUserByUsername(username);

    if (!matchedUser) {
      this.showError('User not found.');
      return;
    }

    this.matchedRepositoryUser.set(matchedUser);
    this.email.set('');
    this.active.set(true);
    this.role.set('');
    this.emailValidationMessage.set('');
    this.roleValidationMessage.set('');
    this.step.set('details');
  }

  protected cancelSearch(): void {
    void this.router.navigate(['/users']);
  }

  protected cancelDetails(): void {
    this.step.set('search');
    this.emailValidationMessage.set('');
    this.roleValidationMessage.set('');
    this.clearErrorToast();
  }

  protected updateEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
    this.emailValidationMessage.set('');
  }

  protected updateRole(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as AssignableUserRole | '');
    this.roleValidationMessage.set('');
  }

  protected updateActive(event: Event): void {
    this.active.set((event.target as HTMLInputElement).checked);
  }

  protected saveUser(): void {
    const email = this.email().trim();
    const role = this.role();
    const matchedUser = this.matchedRepositoryUser();

    this.emailValidationMessage.set('');
    this.roleValidationMessage.set('');
    this.clearErrorToast();

    let hasErrors = false;

    if (email.length === 0) {
      this.emailValidationMessage.set('Email is required');
      hasErrors = true;
    } else if (!this.emailPattern.test(email)) {
      this.emailValidationMessage.set('Email is not in a valid format');
      hasErrors = true;
    }

    if (role.length === 0) {
      this.roleValidationMessage.set('Role is required');
      hasErrors = true;
    }

    if (hasErrors || !matchedUser) {
      return;
    }

    const selectedRole = role as AssignableUserRole;

    const newUser = this.userStore.addUser({
      username: matchedUser.username,
      firstName: matchedUser.firstName,
      lastName: matchedUser.lastName,
      email,
      role: selectedRole,
      active: this.active(),
    });

    this.successToastVisible.set(true);

    window.setTimeout(() => {
      this.successToastVisible.set(false);
      void this.router.navigate(['/users', newUser.userId, 'edit']);
    }, 1200);
  }

  private showError(message: string): void {
    this.errorToastMessage.set(message);

    window.setTimeout(() => {
      this.clearErrorToast();
    }, 2500);
  }

  private clearErrorToast(): void {
    this.errorToastMessage.set('');
  }
}