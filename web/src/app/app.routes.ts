import { Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout';
import { FormListComponent } from './forms/form-list';
import { FormDetailComponent } from './forms/form-detail';
import { FormEditComponent } from './forms/form-edit';
import { SubmissionListComponent } from './submissions/submission-list';
import { SubmissionDetailComponent } from './submissions/submission-detail';
import { FlowListComponent } from './flows/flow-list';
import { FlowDetailComponent } from './flows/flow-detail';
import { FlowEditComponent } from './flows/flow-edit';
import { FlowRunComponent } from './flows/flow-run';

export const routes: Routes = [
  { path: '', redirectTo: 'builder/forms', pathMatch: 'full' },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'builder', redirectTo: 'builder/forms', pathMatch: 'full' },
      { path: 'builder/forms', component: FormListComponent },
      { path: 'builder/forms/new', component: FormEditComponent },
      { path: 'builder/forms/:id', component: FormDetailComponent },
      { path: 'builder/forms/:id/edit', component: FormEditComponent },
      { path: 'builder/flows', component: FlowListComponent, data: { mode: 'builder' } },
      { path: 'builder/flows/new', component: FlowEditComponent },
      { path: 'builder/flows/:id', component: FlowDetailComponent },
      { path: 'builder/flows/:id/edit', component: FlowEditComponent },

      { path: 'submissions', redirectTo: 'submissions/flows', pathMatch: 'full' },
      { path: 'submissions/flows', component: FlowListComponent, data: { mode: 'runner' } },
      { path: 'submissions/flows/:flowId/run', component: FlowRunComponent },
      { path: 'submissions/runs', component: SubmissionListComponent },
      { path: 'submissions/runs/:id', component: SubmissionDetailComponent },
    ],
  },
];
