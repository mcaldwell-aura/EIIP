import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NavMenuComponent } from './nav-menu.component';
import { NavMenuService } from './nav-menu.service';
import { CANDIDATES, type CandidateType } from './candidates.data';

type NameSuffix = 'Jr.' | 'Sr.' | 'II' | 'III' | 'IV';

type CandidateDetailData = {
  candidateId: string;
  candidateName: string;
  candidateType: CandidateType;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  suffix: NameSuffix | null;
  organizationName: string | null;
  externalIdentifier: string | null;
  startDate: string;
  endDate: string | null;
};

const NAME_SUFFIXES: NameSuffix[] = ['Jr.', 'Sr.', 'II', 'III', 'IV'];

@Component({
  selector: 'app-candidate-detail',
  imports: [RouterModule, NavMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './candidate-detail.component.html',
  styleUrl: './candidate-detail.component.scss',
})
export class CandidateDetailComponent {
  private static readonly date = {
    today: (): string => {
      const now = new Date();
      const month = `${now.getMonth() + 1}`.padStart(2, '0');
      const day = `${now.getDate()}`.padStart(2, '0');
      const year = `${now.getFullYear()}`;
      return `${year}-${month}-${day}`;
    },
  };

  protected readonly menuService = inject(NavMenuService);

  private readonly candidateData = signal<CandidateDetailData | null>(null);
  protected readonly candidateId = signal<string>('');

  protected readonly candidateName = signal('');
  protected readonly candidateType = signal<CandidateType>('Individual');
  protected readonly firstName = signal('');
  protected readonly middleName = signal('');
  protected readonly lastName = signal('');
  protected readonly suffix = signal<NameSuffix | ''>('');
  protected readonly organizationName = signal('');
  protected readonly externalIdentifier = signal('');
  protected readonly startDate = signal('');
  protected readonly endDate = signal('');

  protected readonly saveToastVisible = signal(false);
  protected readonly validationErrorMessage = signal('');
  protected readonly showValidationError = computed(() => this.validationErrorMessage().length > 0);

  protected readonly nameSuffixes = NAME_SUFFIXES;

  // Mock permission - in a real app, this would come from a permission service
  protected readonly hasManageCandidatesPermission = true;

  protected readonly isIndividual = computed(() => this.candidateType() === 'Individual');
  protected readonly isOrganization = computed(() => this.candidateType() === 'Organization');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {
    this.route.params.subscribe((params) => {
      this.candidateId.set(params['candidateId']);
      this.loadCandidate(params['candidateId']);
    });
  }

  private loadCandidate(id: string): void {
    const candidate = CANDIDATES.find((record) => record.candidateId === id);

    if (!candidate) {
      // In a real app, handle not found error
      return;
    }

    const mappedCandidate = this.mapCandidateRecord(candidate);

    this.candidateData.set(mappedCandidate);
    this.candidateName.set(mappedCandidate.candidateName);
    this.candidateType.set(mappedCandidate.candidateType);
    this.firstName.set(mappedCandidate.firstName ?? '');
    this.middleName.set(mappedCandidate.middleName ?? '');
    this.lastName.set(mappedCandidate.lastName ?? '');
    this.suffix.set(mappedCandidate.suffix ?? '');
    this.organizationName.set(mappedCandidate.organizationName ?? '');
    this.externalIdentifier.set(mappedCandidate.externalIdentifier ?? '');
    this.startDate.set(mappedCandidate.startDate);
    this.endDate.set(mappedCandidate.endDate ?? '');
  }

  private mapCandidateRecord(candidate: (typeof CANDIDATES)[number]): CandidateDetailData {
    const nameParts = candidate.firstMiddleLast?.split(' ') ?? [];
    const [firstName = null, middleName = null, lastName = null] = nameParts;

    return {
      candidateId: candidate.candidateId,
      candidateName:
        candidate.candidateType === 'Individual'
          ? (candidate.firstMiddleLast ?? '')
          : (candidate.organizationName ?? ''),
      candidateType: candidate.candidateType,
      firstName,
      middleName,
      lastName,
      suffix: null,
      organizationName: candidate.organizationName,
      externalIdentifier: `EXT-${candidate.candidateId.toUpperCase()}`,
      startDate: candidate.startDate,
      endDate: candidate.endDate,
    };
  }

  protected goBack(): void {
    this.router.navigate(['/candidates']);
  }

  protected validateForm(): boolean {
    this.validationErrorMessage.set('');

    // Validate required fields for Individual
    if (this.isIndividual()) {
      if (!this.firstName().trim()) {
        this.validationErrorMessage.set('First Name is required.');
        return false;
      }
      if (this.firstName().length > 50) {
        this.validationErrorMessage.set('First Name must not exceed 50 characters.');
        return false;
      }
      if (this.middleName().length > 50) {
        this.validationErrorMessage.set('Middle Name must not exceed 50 characters.');
        return false;
      }
      if (!this.lastName().trim()) {
        this.validationErrorMessage.set('Last Name is required.');
        return false;
      }
      if (this.lastName().length > 70) {
        this.validationErrorMessage.set('Last Name must not exceed 70 characters.');
        return false;
      }
      if (!this.suffix().trim()) {
        this.validationErrorMessage.set('Suffix is required.');
        return false;
      }
    }

    // Validate required fields for Organization
    if (this.isOrganization()) {
      if (!this.organizationName().trim()) {
        this.validationErrorMessage.set('Organization Name is required.');
        return false;
      }
      if (this.organizationName().length > 256) {
        this.validationErrorMessage.set('Organization Name must not exceed 256 characters.');
        return false;
      }
    }

    // Validate optional fields
    if (this.externalIdentifier().length > 256) {
      this.validationErrorMessage.set('External Identifier must not exceed 256 characters.');
      return false;
    }

    // Validate Start Date
    if (!this.startDate().trim()) {
      this.validationErrorMessage.set('Start Date is required.');
      return false;
    }

    const startDateObj = new Date(this.startDate());
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj > today) {
      this.validationErrorMessage.set('Start Date cannot be in the future.');
      return false;
    }

    // Validate End Date if provided
    if (this.endDate().trim()) {
      const endDateObj = new Date(this.endDate());
      if (endDateObj > today) {
        this.validationErrorMessage.set('End Date cannot be in the future.');
        return false;
      }
      if (endDateObj < startDateObj) {
        this.validationErrorMessage.set('End Date cannot be before Start Date.');
        return false;
      }
    }

    return true;
  }

  protected saveCandidate(): void {
    if (!this.validateForm()) {
      return;
    }

    // In a real app, this would call a service to save the candidate
    // For now, just show the success toast
    this.saveToastVisible.set(true);
    setTimeout(() => {
      this.saveToastVisible.set(false);
    }, 3000);
  }

  protected onFirstNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.firstName.set(input.value);
  }

  protected onMiddleNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.middleName.set(input.value);
  }

  protected onLastNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.lastName.set(input.value);
  }

  protected onSuffixChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.suffix.set(select.value as NameSuffix | '');
  }

  protected onOrganizationNameChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.organizationName.set(input.value);
  }

  protected onExternalIdentifierChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.externalIdentifier.set(input.value);
  }

  protected onStartDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.startDate.set(input.value);
  }

  protected onEndDateChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.endDate.set(input.value);
  }
}
