import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'inspection-overview/inspection/:inspectionId',
    renderMode: RenderMode.Server,
  },
  {
    path: 'inspection-overview/subject/:subjectId',
    renderMode: RenderMode.Server,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
