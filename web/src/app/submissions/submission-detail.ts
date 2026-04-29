import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsService, Submission } from '../forms/forms.service';

@Component({
  selector: 'app-submission-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './submission-detail.html',
})
export class SubmissionDetailComponent implements OnInit {
  private svc = inject(FormsService);
  private route = inject(ActivatedRoute);

  submission = signal<Submission | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getSubmission(id).subscribe((s) => this.submission.set(s));
  }
}
