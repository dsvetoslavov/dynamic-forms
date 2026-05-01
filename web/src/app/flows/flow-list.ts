import { Component, inject, input, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FlowsService, FlowSummary } from './flows.service';

@Component({
  selector: 'app-flow-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './flow-list.html',
})
export class FlowListComponent implements OnInit {
  mode = input<'builder' | 'runner'>('builder');
  private svc = inject(FlowsService);
  flows = signal<FlowSummary[]>([]);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.svc.list().subscribe((f) => this.flows.set(f));
  }

  deleteFlow(flow: FlowSummary) {
    if (!confirm(`Delete flow "${flow.name}"?`)) return;
    this.svc.delete(flow.id).subscribe(() => this.load());
  }
}
