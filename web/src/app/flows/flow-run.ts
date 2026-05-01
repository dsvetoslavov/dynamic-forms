import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FlowsService, FlowDetail, FlowRule } from './flows.service';
import { Question } from '../forms/forms.service';
import { evaluateRules } from './rule-engine';

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
  answers = signal<Record<string, string>>({});
  // Answers from previously submitted forms (for cross-form rule evaluation)
  priorAnswers = signal<Record<string, string>>({});

  visibleQuestions = computed(() => {
    const questions = this.currentFormQuestions();
    if (!questions.length) return [];

    const sorted = [...questions].sort((a, b) => a.order - b.order);
    const currentQIds = questions.map((q) => q.id!);
    const answerContext = { ...this.priorAnswers(), ...this.answers() };
    const allRules = this.allRules()
    const interformRules = allRules.filter(r => this.currentFormQuestions().map(q => q.id).filter(q => !!q).includes(r.sourceQuestionId));
    const enabled = evaluateRules(interformRules, answerContext, currentQIds);

    return sorted.filter((q) => enabled.has(q.id!));
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

          // Accumulate current answers into prior answers for cross-form rules
          this.priorAnswers.update((prior) => ({ ...prior, ...this.answers() }));

          // Advance to next form
          const next = result.nextForm!;
          this.currentFormIndex.set(next.order);
          this.currentFormId.set(next.id);
          this.currentFormName.set(next.name);
          this.currentFormQuestions.set(
            (next.questions || []).sort((a, b) => a.order - b.order),
          );
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
