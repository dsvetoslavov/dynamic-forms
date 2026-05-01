import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsService, Form, Rule } from './forms.service';

@Component({
  selector: 'app-form-detail',
  imports: [RouterLink],
  templateUrl: './form-detail.html',
})
export class FormDetailComponent implements OnInit {
  private svc = inject(FormsService);
  private route = inject(ActivatedRoute);

  form = signal<Form | null>(null);
  rules = signal<Rule[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(id).subscribe((f) => this.form.set(f));
  }

  sortedQuestions(f: Form) {
    return [...(f.questions || [])].sort((a, b) => a.order - b.order);
  }

  questionLabel(id: string): string {
    const q = this.form()?.questions?.find((q) => q.id === id);
    return q?.label || id;
  }
}
