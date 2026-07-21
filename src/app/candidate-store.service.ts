import { computed, Injectable, signal } from '@angular/core';
import {
  CANDIDATES,
  type CandidateRecord,
  type CandidateType,
  type NameSuffix,
} from './candidates.data';

type AddCandidateInput = {
  candidateType: CandidateType;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: NameSuffix | null;
  organizationName: string;
  nextDueDate: string | null;
  externalIdentifier: string;
  startDate: string;
  endDate: string | null;
};

export type UpdateCandidateInput = {
  candidateType: CandidateType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: NameSuffix | null;
  organizationName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  nextDueDate: string | null;
  externalIdentifier: string | null;
  startDate: string;
  endDate: string | null;
  passRate: string | null;
  testVolume: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class CandidateStoreService {
  private readonly candidateRows = signal<CandidateRecord[]>([...CANDIDATES]);

  readonly candidates = computed(() => this.candidateRows());

  findCandidateById(candidateId: string): CandidateRecord | null {
    return this.candidateRows().find((row) => row.candidateId === candidateId) ?? null;
  }

  addCandidate(input: AddCandidateInput): CandidateRecord {
    const nextCandidateId = `candidate-${this.candidateRows().length + 1}`;
    const firstName = input.firstName.trim();
    const middleName = input.middleName.trim();
    const lastName = input.lastName.trim();
    const organizationName = input.organizationName.trim();

    const firstMiddleLast =
      input.candidateType === 'Individual'
        ? [firstName, middleName, lastName].filter((part) => part.length > 0).join(' ')
        : null;

    const newCandidate: CandidateRecord = {
      candidateId: nextCandidateId,
      candidateType: input.candidateType,
      firstMiddleLast,
      organizationName: input.candidateType === 'Organization' ? organizationName : null,
      firstName: input.candidateType === 'Individual' ? firstName : null,
      middleName: input.candidateType === 'Individual' ? middleName || null : null,
      lastName: input.candidateType === 'Individual' ? lastName : null,
      suffix: input.candidateType === 'Individual' ? input.suffix : null,
      externalIdentifier: input.externalIdentifier.trim() || null,
      startDate: input.startDate,
      endDate: input.endDate,
      nextDueDate: input.nextDueDate,
    };

    this.candidateRows.update((currentRows) => [...currentRows, newCandidate]);
    return newCandidate;
  }

  updateCandidate(candidateId: string, input: UpdateCandidateInput): CandidateRecord | null {
    let updatedCandidate: CandidateRecord | null = null;

    this.candidateRows.update((currentRows) =>
      currentRows.map((currentRow) => {
        if (currentRow.candidateId !== candidateId) {
          return currentRow;
        }

        const firstName = input.firstName?.trim() ?? '';
        const middleName = input.middleName?.trim() ?? '';
        const lastName = input.lastName?.trim() ?? '';
        const organizationName = input.organizationName?.trim() ?? '';

        updatedCandidate = {
          ...currentRow,
          candidateType: input.candidateType,
          firstMiddleLast:
            input.candidateType === 'Individual'
              ? [firstName, middleName, lastName].filter((part) => part.length > 0).join(' ')
              : null,
          organizationName: input.candidateType === 'Organization' ? organizationName : null,
          firstName: input.candidateType === 'Individual' ? firstName : null,
          middleName: input.candidateType === 'Individual' ? middleName || null : null,
          lastName: input.candidateType === 'Individual' ? lastName : null,
          suffix: input.candidateType === 'Individual' ? input.suffix : null,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          externalIdentifier: input.externalIdentifier?.trim() || null,
          passRate: input.passRate,
          testVolume: input.testVolume,
          startDate: input.startDate,
          endDate: input.endDate,
          nextDueDate: input.nextDueDate,
        };

        return updatedCandidate;
      }),
    );

    return updatedCandidate;
  }
}
