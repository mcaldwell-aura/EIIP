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
import { UserSettingsComponent } from './user-settings.component';
import { CandidateNextDueConfigComponent } from './candidate-next-due-config.component';
import { WeeklyDigestTimeConfigComponent } from './weekly-digest-time-config.component';
import { InspectorsComponent } from './inspectors.component';
import { InspectorDetailComponent } from './inspector-detail.component';
import { ConfigurationSettingsComponent } from './configuration-settings.component';
import { configurationSettingsUnsavedChangesGuard } from './configuration-settings-unsaved-changes.guard';

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
    path: 'inspectors',
    component: InspectorsComponent,
  },
  {
    path: 'inspectors/:inspectorId',
    component: InspectorDetailComponent,
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
    path: 'admin/configuration/next-due',
    component: CandidateNextDueConfigComponent,
  },
  {
    path: 'admin/configuration/weekly-digest-time',
    component: WeeklyDigestTimeConfigComponent,
  },
  {
    path: 'admin/configuration/settings',
    component: ConfigurationSettingsComponent,
    canDeactivate: [configurationSettingsUnsavedChangesGuard],
  },
];
