import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsService, Submission } from '../forms/forms.service';

@Component({
  selector: 'app-submission-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './submission-list.html',
})
export class SubmissionListComponent implements OnInit {
  private svc = inject(FormsService);
  submissions = signal<Submission[]>([]);

  ngOnInit() {
    this.svc.listSubmissions().subscribe((s) => this.submissions.set(s));
  }
}
