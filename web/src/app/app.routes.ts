import { Routes } from '@angular/router';
import { FormListComponent } from './forms/form-list';
import { FormDetailComponent } from './forms/form-detail';
import { FormEditComponent } from './forms/form-edit';
import { FormSubmitComponent } from './forms/form-submit';
import { SubmissionListComponent } from './submissions/submission-list';
import { SubmissionDetailComponent } from './submissions/submission-detail';

export const routes: Routes = [
  { path: '', redirectTo: 'forms', pathMatch: 'full' },
  { path: 'forms', component: FormListComponent },
  { path: 'forms/new', component: FormEditComponent },
  { path: 'forms/:id', component: FormDetailComponent },
  { path: 'forms/:id/edit', component: FormEditComponent },
  { path: 'forms/:id/submit', component: FormSubmitComponent },
  { path: 'submissions', component: SubmissionListComponent },
  { path: 'submissions/:id', component: SubmissionDetailComponent },
];
