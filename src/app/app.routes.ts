import { Routes } from '@angular/router';
import { CreateInspectionComponent } from './create-inspection.component';
import { DashboardComponent } from './dashboard.component';
import { InspectionDetailsComponent } from './inspection-details.component';
import { InspectionOverviewComponent } from './inspection-overview.component';
import { SubjectDetailsComponent } from './subject-details.component';

export const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
  },
  {
    path: 'inspection-overview',
    component: InspectionOverviewComponent,
  },
  {
    path: 'inspection-overview/create-inspection',
    component: CreateInspectionComponent,
  },
  {
    path: 'inspection-overview/inspection/:inspectionId',
    component: InspectionDetailsComponent,
  },
  {
    path: 'inspection-overview/subject/:subjectId',
    component: SubjectDetailsComponent,
  },
];
