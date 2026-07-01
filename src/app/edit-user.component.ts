import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NavMenuService } from './nav-menu.service';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { USER_ROLES, type UserRole } from './users.data';
import { UserStoreService } from './user-store.service';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DialogModule } from 'primeng/dialog';
import { MenubarModule } from 'primeng/menubar';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-edit-user',
  imports: [
    CommonModule,
    FormsModule,
    ToastModule,
    TableModule,
    CheckboxModule,
    AvatarModule,
    MenuModule,
    MenubarModule,
    DialogModule,
    SelectModule,
    RouterModule,
    ButtonModule,
    RippleModule,
    InputTextModule,
    TextareaModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-user.component.html',
  styleUrl: './edit-user.component.scss',
})
export class EditUserComponent {
  protected readonly menuService = inject(NavMenuService);
  protected readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly userStore = inject(UserStoreService);
  protected readonly userId = this.route.snapshot.paramMap.get('userId') ?? '';
  private readonly user = computed(() => this.userStore.findUserById(this.userId));

  protected readonly roles = USER_ROLES;
  protected readonly activeOptions = [
    { label: 'Yes', value: true },
    { label: 'No', value: false },
  ];
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

  protected updateRole(value: UserRole): void {
    this.role.set(value);
  }

  protected updateActive(value: boolean): void {
    this.active.set(value);
  }

  protected saveUser(): void {
    this.userStore.updateUser(this.userId, {
      firstName: this.firstName(),
      lastName: this.lastName(),
      email: this.email(),
      role: this.role(),
      active: this.active(),
    });

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'User saved successfully.',
      life: 3000,
    });
  }
}
