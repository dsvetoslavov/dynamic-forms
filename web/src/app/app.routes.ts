import { Routes } from '@angular/router';
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
  { path: '', redirectTo: 'forms', pathMatch: 'full' },
  { path: 'forms', component: FormListComponent },
  { path: 'forms/new', component: FormEditComponent },
  { path: 'forms/:id', component: FormDetailComponent },
  { path: 'forms/:id/edit', component: FormEditComponent },
  { path: 'submissions', component: SubmissionListComponent },
  { path: 'submissions/:id', component: SubmissionDetailComponent },
  { path: 'flows', component: FlowListComponent },
  { path: 'flows/new', component: FlowEditComponent },
  { path: 'flows/:id', component: FlowDetailComponent },
  { path: 'flows/:id/edit', component: FlowEditComponent },
  { path: 'flows/:flowId/run', component: FlowRunComponent },
];
