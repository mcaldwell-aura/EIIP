import { Injectable, computed, signal } from '@angular/core';
import {
  ACCOUNT_REPOSITORY_USERS,
  USERS,
  type AccountRepositoryUser,
  type AssignableUserRole,
  type UserRecord,
} from './users.data';

type AddUserInput = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AssignableUserRole;
  active: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class UserStoreService {
  private readonly userRows = signal<UserRecord[]>(USERS);
  private readonly accountRepositoryRows = ACCOUNT_REPOSITORY_USERS;

  readonly users = computed(() => this.userRows());

  findUserById(userId: string): UserRecord | null {
    return this.userRows().find((row) => row.userId === userId) ?? null;
  }

  findUserByUsername(username: string): UserRecord | null {
    return this.userRows().find((row) => row.username === username) ?? null;
  }

  usernameExists(username: string): boolean {
    return this.findUserByUsername(username) !== null;
  }

  findRepositoryUserByUsername(username: string): AccountRepositoryUser | null {
    return this.accountRepositoryRows.find((row) => row.username === username) ?? null;
  }

  addUser(input: AddUserInput): UserRecord {
    const nextUserId = `user-${this.userRows().length + 1}`;
    const newUser: UserRecord = {
      userId: nextUserId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      role: input.role,
      active: input.active,
    };

    this.userRows.update((currentRows) => [...currentRows, newUser]);
    return newUser;
  }

  updateUser(userId: string, updates: Partial<UserRecord>): void {
    this.userRows.update((currentRows) =>
      currentRows.map((row) => (row.userId === userId ? { ...row, ...updates } : row)),
    );
  }
}