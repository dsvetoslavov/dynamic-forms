import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { FlowsService, RuleDraft } from './flows.service';
import { FormsService, Form, Question } from '../forms/forms.service';

interface SelectedForm {
  id: string;
  name: string;
  questions: Question[];
}

@Component({
  selector: 'app-flow-edit',
  imports: [FormsModule, RouterLink],
  templateUrl: './flow-edit.html',
})
export class FlowEditComponent implements OnInit {
  private flowsSvc = inject(FlowsService);
  private formsSvc = inject(FormsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isNew = signal(true);
  name = '';
  description = '';
  availableForms = signal<Form[]>([]);
  selectedForms = signal<SelectedForm[]>([]);
  rules = signal<RuleDraft[]>([]);
  formToAdd = '';
  private flowId = '';
  private nextIdx = 0;

  unselectedForms = computed(() => {
    const selectedIds = new Set(this.selectedForms().map((f) => f.id));
    return this.availableForms().filter((f) => !selectedIds.has(f.id));
  });

  ngOnInit() {
    this.formsSvc.list().subscribe((forms) => this.availableForms.set(forms));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isNew.set(false);
      this.flowId = id;
      this.flowsSvc.get(id).subscribe((flow) => {
        this.name = flow.name;
        this.description = flow.description || '';
        if (flow.forms.length) {
          const sorted = [...flow.forms].sort((a, b) => a.order - b.order);
          forkJoin(sorted.map((f) => this.formsSvc.get(f.id))).subscribe((forms) => {
            this.selectedForms.set(forms.map((f) => ({ id: f.id, name: f.name, questions: f.questions || [] })));
          });
        }
        this.rules.set(
          flow.rules.map((r) => ({
            sourceQuestionId: r.sourceQuestionId,
            triggerValue: r.triggerValue,
            targetQuestionId: r.targetQuestionId,
            _idx: this.nextIdx++,
          })),
        );
      });
    }
  }

  addForm() {
    if (!this.formToAdd) return;
    const id = this.formToAdd;
    this.formToAdd = '';
    this.formsSvc.get(id).subscribe((form) => {
      this.selectedForms.update((fs) => [...fs, { id: form.id, name: form.name, questions: form.questions || [] }]);
    });
  }

  removeForm(index: number) {
    const removed = this.selectedForms()[index];
    const removedQIds = new Set(removed.questions.map((q) => q.id));
    this.selectedForms.update((fs) => fs.filter((_, i) => i !== index));
    this.rules.update((rs) => rs.filter((r) => !removedQIds.has(r.sourceQuestionId) && !removedQIds.has(r.targetQuestionId)));
  }

  moveForm(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    this.selectedForms.update((fs) => {
      const arr = [...fs];
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      return arr;
    });
    this.cleanInvalidRules();
  }

  addRule() {
    this.rules.update((rs) => [...rs, { sourceQuestionId: '', triggerValue: '', targetQuestionId: '', _idx: this.nextIdx++ }]);
  }

  removeRule(index: number) {
    this.rules.update((rs) => rs.filter((_, i) => i !== index));
  }

  onSourceChange(rule: RuleDraft) {
    rule.triggerValue = '';
  }

  getSourceQuestion(questionId: string): Question | undefined {
    for (const f of this.selectedForms()) {
      const q = f.questions.find((q) => q.id === questionId);
      if (q) return q;
    }
    return undefined;
  }

  targetQuestionsFor(sourceQuestionId: string): { formName: string; questions: Question[] }[] {
    const forms = this.selectedForms();
    const sourceFormIdx = forms.findIndex((f) => f.questions.some((q) => q.id === sourceQuestionId));
    if (sourceFormIdx === -1) return [];
    return forms.slice(sourceFormIdx).map((f) => ({ formName: f.name, questions: f.questions }));
  }

  allQuestionGroups(): { formName: string; questions: Question[] }[] {
    return this.selectedForms().map((f) => ({ formName: f.name, questions: f.questions }));
  }

  save() {
    const formIds = this.selectedForms().map((f) => f.id);
    const rules = this.rules()
      .filter((r) => r.sourceQuestionId && r.triggerValue && r.targetQuestionId)
      .map((r) => ({ sourceQuestionId: r.sourceQuestionId, triggerValue: r.triggerValue, targetQuestionId: r.targetQuestionId }));

    const body = { name: this.name, description: this.description, formIds, rules };

    const req = this.isNew() ? this.flowsSvc.create(body) : this.flowsSvc.update(this.flowId, body);
    req.subscribe((flow) => this.router.navigate(['/flows', flow.id]));
  }

  private cleanInvalidRules() {
    const forms = this.selectedForms();
    this.rules.update((rs) =>
      rs.filter((r) => {
        if (!r.sourceQuestionId || !r.targetQuestionId) return true;
        const srcIdx = forms.findIndex((f) => f.questions.some((q) => q.id === r.sourceQuestionId));
        const tgtIdx = forms.findIndex((f) => f.questions.some((q) => q.id === r.targetQuestionId));
        return srcIdx !== -1 && tgtIdx !== -1 && tgtIdx >= srcIdx;
      }),
    );
  }
}
