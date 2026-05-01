import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FlowsService, FlowRunDetail } from '../flows/flows.service';

@Component({
  selector: 'app-submission-detail',
  imports: [RouterLink, DatePipe],
  templateUrl: './submission-detail.html',
})
export class SubmissionDetailComponent implements OnInit {
  private svc = inject(FlowsService);
  private route = inject(ActivatedRoute);
  run = signal<FlowRunDetail | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.getFlowRun(id).subscribe((r) => this.run.set(r));
  }
}
