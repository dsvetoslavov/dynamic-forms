import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlowsService, FlowDetail, FlowRule } from './flows.service';
import { Question } from '../forms/forms.service';

@Component({
  selector: 'app-flow-run',
  imports: [FormsModule, RouterLink],
  templateUrl: './flow-run.html',
})
export class FlowRunComponent implements OnInit {
  private flowsSvc = inject(FlowsService);
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

  // Flow run tracking
  runId = signal('');

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

      // Resume existing run if runId query param is present
      const resumeRunId = this.route.snapshot.queryParamMap.get('runId');
      if (resumeRunId) {
        this.resumeRun(resumeRunId);
      }
    });
  }

  private resumeRun(runId: string) {
    this.flowsSvc.getFlowRunState(runId).subscribe({
      next: (state) => {
        if (!state.formId) {
          this.step.set('complete');
          return;
        }
        this.runId.set(runId);
        this.username = state.username;
        this.currentFormIndex.set(state.formOrder);
        this.currentFormId.set(state.formId);
        this.currentFormName.set(state.formName ?? '');
        this.currentFormQuestions.set(state.questions || []);
        this.enabledFromServer.set(new Set(state.enabledQuestionIds));
        this.step.set('filling');
      },
      error: (err) =>
        this.error.set(err?.error?.message || 'Failed to resume flow.'),
    });
  }

  startFlow() {
    if (!this.username.trim()) {
      this.error.set('Name is required.');
      return;
    }
    this.error.set('');

    const flow = this.flow()!;

    this.flowsSvc.createFlowRun(flow.id, this.username).subscribe({
      next: (result) => {
        this.runId.set(result.id);
        this.currentFormIndex.set(result.firstForm.order);
        this.currentFormId.set(result.firstForm.id);
        this.currentFormName.set(result.firstForm.name);
        this.currentFormQuestions.set(result.firstForm.questions || []);
        this.enabledFromServer.set(new Set(result.firstForm.enabledQuestionIds));
        this.step.set('filling');
      },
      error: (err) =>
        this.error.set(err?.error?.message || 'Failed to start flow.'),
    });
  }

  submitCurrentForm() {
    this.error.set('');
    const visible = this.visibleQuestions();
    const answers = this.answers();
    const answerList = visible
      .filter((q) => answers[q.id!])
      .map((q) => ({ questionId: q.id!, value: answers[q.id!] }));

    this.flowsSvc
      .submitFlowRunForm(this.runId(), this.currentFormId(), answerList)
      .subscribe({
        next: (result) => {
          if (result.isComplete) {
            this.step.set('complete');
            return;
          }

          // Advance to next form
          const next = result.nextForm!;
          this.currentFormIndex.set(next.order);
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
