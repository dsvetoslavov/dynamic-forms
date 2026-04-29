import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormsService, Question, Rule } from './forms.service';

@Component({
  selector: 'app-form-edit',
  imports: [FormsModule, RouterLink],
  templateUrl: './form-edit.html',
})
export class FormEditComponent implements OnInit {
  private svc = inject(FormsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = signal(true);
  name = '';
  description = '';
  questions = signal<QuestionDraft[]>([]);
  rules = signal<Rule[]>([]);
  newRuleDrafts: Record<string, { triggerValue: string; sourceQuestionId: string }> = {};
  private formId = '';
  private nextIdx = 0;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.formId = id;
      this.svc.get(id).subscribe((form) => {
        this.name = form.name;
        this.description = form.description || '';
        const qs = form.questions
          .sort((a, b) => a.order - b.order)
          .map((q) => ({
            ...q,
            _idx: this.nextIdx++,
            optionsStr: q.config?.['options']?.join(', ') || '',
          }));
        this.questions.set(qs);
        for (const q of qs) {
          if (q.id) this.newRuleDrafts[q.id] = { triggerValue: '', sourceQuestionId: '' };
        }
      });
      this.loadRules();
    }
  }

  private loadRules() {
    this.svc.getRules(this.formId).subscribe((r) => this.rules.set(r));
  }

  rulesForQuestion(questionId: string): Rule[] {
    return this.rules().filter((r) => r.targetQuestionId === questionId);
  }

  otherQuestions(excludeId: string): QuestionDraft[] {
    return this.questions().filter((q) => q.id && q.id !== excludeId);
  }

  questionLabelById(id: string): string {
    return this.questions().find((q) => q.id === id)?.label || '(unknown)';
  }

  addRule(targetQuestionId: string) {
    const draft = this.newRuleDrafts[targetQuestionId];
    if (!draft?.triggerValue || !draft?.sourceQuestionId) return;
    this.svc.createRule(this.formId, {
      targetQuestionId,
      triggerValue: draft.triggerValue,
      sourceQuestionId: draft.sourceQuestionId,
    }).subscribe(() => {
      this.newRuleDrafts[targetQuestionId] = { triggerValue: '', sourceQuestionId: '' };
      this.loadRules();
    });
  }

  deleteRule(ruleId: string) {
    this.svc.deleteRule(this.formId, ruleId).subscribe(() => this.loadRules());
  }

  addQuestion() {
    this.questions.update((qs) => [
      ...qs,
      { type: 'text', label: '', order: qs.length, required: false, config: {}, _idx: this.nextIdx++, optionsStr: '' },
    ]);
  }

  removeQuestion(index: number) {
    this.questions.update((qs) => qs.filter((_, i) => i !== index));
  }

  save() {
    const questions = this.questions().map((q, i) => ({
      ...(q.id ? { id: q.id } : {}),
      type: q.type,
      label: q.label,
      order: i,
      required: q.required,
      config: q.type === 'select' || q.type === 'multi_select'
        ? { options: q.optionsStr.split(',').map((s) => s.trim()).filter(Boolean) }
        : {},
    }));

    const body = { name: this.name, description: this.description, questions } as any;

    const req = this.isNew()
      ? this.svc.create(body)
      : this.svc.update(this.formId, body);

    req.subscribe((form) => this.router.navigate(['/forms', form.id]));
  }
}

interface QuestionDraft extends Question {
  _idx: number;
  optionsStr: string;
}
