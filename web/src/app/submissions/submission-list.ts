import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FlowsService, FlowRunSummary } from '../flows/flows.service';

@Component({
  selector: 'app-submission-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './submission-list.html',
})
export class SubmissionListComponent implements OnInit {
  private svc = inject(FlowsService);
  runs = signal<FlowRunSummary[]>([]);

  ngOnInit() {
    this.svc.listFlowRuns().subscribe((r) => this.runs.set(r));
  }
}
