import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { FlowsService, FlowDetail } from './flows.service';
import { FormsService, Question } from '../forms/forms.service';

@Component({
  selector: 'app-flow-detail',
  imports: [RouterLink],
  templateUrl: './flow-detail.html',
})
export class FlowDetailComponent implements OnInit {
  private flowsSvc = inject(FlowsService);
  private formsSvc = inject(FormsService);
  private route = inject(ActivatedRoute);

  flow = signal<FlowDetail | null>(null);
  questionMap = signal<Map<string, Question & { formName: string }>>(new Map());

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.flowsSvc.get(id).subscribe((flow) => {
      this.flow.set(flow);
      if (flow.forms.length) {
        forkJoin(flow.forms.map((f) => this.formsSvc.get(f.id))).subscribe((forms) => {
          const map = new Map<string, Question & { formName: string }>();
          for (const form of forms) {
            for (const q of form.questions || []) {
              map.set(q.id!, { ...q, formName: form.name });
            }
          }
          this.questionMap.set(map);
        });
      }
    });
  }

  questionLabel(id: string): string {
    const q = this.questionMap().get(id);
    return q ? `${q.formName} > ${q.label}` : id;
  }
}
