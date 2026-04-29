import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormsService, Form, Rule } from './forms.service';

@Component({
  selector: 'app-form-submit',
  imports: [FormsModule, RouterLink],
  templateUrl: './form-submit.html',
})
export class FormSubmitComponent implements OnInit {
  private svc = inject(FormsService);
  private route = inject(ActivatedRoute);

  form = signal<Form | null>(null);
  rules = signal<Rule[]>([]);
  submitted = signal(false);
  error = signal('');
  username = '';
  answers = signal<Record<string, string>>({});

  visibleQuestions = computed(() => {
    const f = this.form();
    if (!f) return [];

    const sorted = [...(f.questions || [])].sort((a, b) => a.order - b.order);
    const rules = this.rules();
    const answers = this.answers();

    const targetIds = new Set(rules.map((r) => r.targetQuestionId));

    const enabledIds = new Set<string>();
  
    debugger;
    for (const rule of rules) {
      const answer = answers[rule.sourceQuestionId] || '';
      const matches =
        rule.operator === '=' ? answer.toLowerCase() === rule.triggerValue.toLocaleLowerCase()
        : answer.includes(rule.triggerValue.toLocaleLowerCase());
      if (matches) {
        enabledIds.add(rule.targetQuestionId);
      }
    }

    return sorted.filter((q) => !targetIds.has(q.id!) || enabledIds.has(q.id!));
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.get(id).subscribe((f) => this.form.set(f));
    this.svc.getRules(id).subscribe((r) => this.rules.set(r));
 }

  updateAnswer(qId: string, value: string) {
    this.answers.update((a) => ({ ...a, [qId]: String(value) }));
  }

  isChecked(qId: string, opt: string): boolean {
    return (this.answers()[qId] || '').split(',').filter(Boolean).includes(opt);
  }

  toggleMulti(qId: string, opt: string) {
    const current = (this.answers()[qId] || '').split(',').filter(Boolean);
    const value = current.includes(opt)
      ? current.filter((o) => o !== opt).join(',')
      : [...current, opt].join(',');
    this.updateAnswer(qId, value);
  }

  submit() {
    const f = this.form()!;
    if (!this.username.trim()) {
      this.error.set('Name is required.');
      return;
    }

    const visible = this.visibleQuestions();
    const answers = this.answers();
    const answerList = visible
      .filter((q) => answers[q.id!])
      .map((q) => ({ questionId: q.id!, value: answers[q.id!] }));

    this.svc.submit({ formId: f.id, username: this.username, answers: answerList }).subscribe({
      next: () => this.submitted.set(true),
      error: (err) => this.error.set(err?.error?.message || 'Submission failed.'),
    });
  }

  reset() {
    this.submitted.set(false);
    this.error.set('');
    this.username = '';
    this.answers.set({});
  }
}
