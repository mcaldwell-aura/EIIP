import { Routes } from '@angular/router';
import { CandidatesComponent } from './candidates.component';
import { DashboardComponent } from './dashboard.component';
import { InspectionDetailsComponent } from './inspection-details.component';
import { InspectionFormComponent } from './inspection-form.component';
import { InspectionOverviewComponent } from './inspection-overview.component';
import { SubjectDetailsComponent } from './subject-details.component';
import { CandidateDetailComponent } from './candidate-detail.component';
import { UsersComponent } from './users.component';
import { EditUserComponent } from './edit-user.component';
import { AddUserComponent } from './add-user.component';
import { LocationsComponent } from './locations.component';
import { LocationDetailComponent } from './location-detail.component';
import { InspectorDashboardComponent } from './inspector-dashboard.component';
import { InspectionSearchComponent } from './inspection-search.component';
import { FormsMockupAccordionComponent } from './forms-mockup-accordion.component';
import { FormsMockupModalComponent } from './forms-mockup-modal.component';
import { UserSettingsComponent } from './user-settings.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'inspector-dashboard',
    component: InspectorDashboardComponent,
  },
  {
    path: 'inspection-overview',
    component: InspectionOverviewComponent,
  },
  {
    path: 'inspection-search',
    component: InspectionSearchComponent,
  },
  {
    path: 'candidates',
    component: CandidatesComponent,
  },
  {
    path: 'candidates/:candidateId',
    component: CandidateDetailComponent,
  },
  {
    path: 'users',
    component: UsersComponent,
  },
  {
    path: 'users/add',
    component: AddUserComponent,
  },
  {
    path: 'users/:userId/edit',
    component: EditUserComponent,
  },
  {
    path: 'user-settings',
    component: UserSettingsComponent,
  },
  {
    path: 'locations',
    component: LocationsComponent,
  },
  {
    path: 'locations/:locationId',
    component: LocationDetailComponent,
  },
  {
    path: 'inspection-overview/inspection/:inspectionId',
    component: InspectionDetailsComponent,
  },
  {
    path: 'inspection-overview/inspection/:inspectionId/forms/:formId',
    component: InspectionFormComponent,
  },
  {
    path: 'inspection-overview/subject/:subjectId',
    component: SubjectDetailsComponent,
  },
  {
    path: 'forms-mockups/accordion',
    component: FormsMockupAccordionComponent,
  },
  {
    path: 'forms-mockups/modal',
    component: FormsMockupModalComponent,
  },
];
