import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FlowsService, FlowDetail, FlowRule } from './flows.service';
import { FormsService, Question } from '../forms/forms.service';

@Component({
  selector: 'app-flow-run',
  imports: [FormsModule, RouterLink],
  templateUrl: './flow-run.html',
})
export class FlowRunComponent implements OnInit {
  private flowsSvc = inject(FlowsService);
  private formsSvc = inject(FormsService);
  private route = inject(ActivatedRoute);

  flow = signal<FlowDetail | null>(null);
  step = signal<'username' | 'filling' | 'complete'>('username');
  username = '';
  error = signal('');

  // Current form being filled
  currentFormIndex = signal(0);
  currentFormQuestions = signal<Question[]>([]);
  currentFormName = signal('');
  currentFormId = signal('');

  // All forms' questions (for rule source lookup)
  allRules = signal<FlowRule[]>([]);
  enabledFromServer = signal<Set<string>>(new Set());
  answers = signal<Record<string, string>>({});

  // Questions on the current form that are targets of same-form rules
  sameFormRules = computed(() => {
    const rules = this.allRules();
    const qIds = new Set(this.currentFormQuestions().map((q) => q.id!));
    return rules.filter(
      (r) => qIds.has(r.sourceQuestionId) && qIds.has(r.targetQuestionId),
    );
  });

  visibleQuestions = computed(() => {
    const questions = this.currentFormQuestions();
    if (!questions.length) return [];

    const sorted = [...questions].sort((a, b) => a.order - b.order);
    const allRules = this.allRules();
    const sameFormRules = this.sameFormRules();
    const serverEnabled = this.enabledFromServer();
    const answers = this.answers();
    const currentQIds = new Set(questions.map((q) => q.id!));

    // All rule targets on this form
    const targetIds = new Set(
      allRules
        .filter((r) => currentQIds.has(r.targetQuestionId))
        .map((r) => r.targetQuestionId),
    );

    // Evaluate same-form rules client-side
    const sameFormEnabled = new Set<string>();
    for (const rule of sameFormRules) {
      const answer = answers[rule.sourceQuestionId] || '';
      const matches =
        rule.operator === '='
          ? answer.toLowerCase() === rule.triggerValue.toLowerCase()
          : answer.toLowerCase().includes(rule.triggerValue.toLowerCase());
      if (matches) {
        sameFormEnabled.add(rule.targetQuestionId);
      }
    }

    return sorted.filter(
      (q) =>
        !targetIds.has(q.id!) ||
        serverEnabled.has(q.id!) ||
        sameFormEnabled.has(q.id!),
    );
  });

  totalForms = computed(() => this.flow()?.forms.length ?? 0);

  ngOnInit() {
    const flowId = this.route.snapshot.paramMap.get('flowId')!;
    this.flowsSvc.get(flowId).subscribe((flow) => {
      this.flow.set(flow);
      this.allRules.set(flow.rules);
    });
  }

  startFlow() {
    if (!this.username.trim()) {
      this.error.set('Name is required.');
      return;
    }
    this.error.set('');

    const flow = this.flow()!;
    const sortedForms = [...flow.forms].sort((a, b) => a.order - b.order);
    const first = sortedForms[0];
    if (!first) {
      this.error.set('This flow has no forms.');
      return;
    }

    this.currentFormIndex.set(0);
    this.currentFormId.set(first.id);
    this.currentFormName.set(first.name);

    // Load questions for first form + get enabled state
    forkJoin([
      this.formsSvc.get(first.id),
      this.flowsSvc.getFormState(flow.id, first.id, this.username),
    ]).subscribe({
      next: ([form, state]) => {
        this.currentFormQuestions.set(form.questions || []);
        this.enabledFromServer.set(new Set(state.enabledQuestionIds));
        this.step.set('filling');
      },
      error: (err) =>
        this.error.set(err?.error?.message || 'Failed to start flow.'),
    });
  }

  submitCurrentForm() {
    this.error.set('');
    const flow = this.flow()!;
    const visible = this.visibleQuestions();
    const answers = this.answers();
    const answerList = visible
      .filter((q) => answers[q.id!])
      .map((q) => ({ questionId: q.id!, value: answers[q.id!] }));

    this.flowsSvc
      .submitForm(flow.id, {
        formId: this.currentFormId(),
        username: this.username,
        answers: answerList,
      })
      .subscribe({
        next: (result) => {
          if (result.isComplete) {
            this.step.set('complete');
            return;
          }

          // Advance to next form
          const next = result.nextForm!;
          this.currentFormIndex.update((i) => i + 1);
          this.currentFormId.set(next.id);
          this.currentFormName.set(next.name);
          this.currentFormQuestions.set(
            (next.questions || []).sort((a, b) => a.order - b.order),
          );
          this.enabledFromServer.set(new Set(next.enabledQuestionIds));
          this.answers.set({});
        },
        error: (err) =>
          this.error.set(err?.error?.message || 'Submission failed.'),
      });
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

  get isLastForm(): boolean {
    return this.currentFormIndex() >= this.totalForms() - 1;
  }
}
