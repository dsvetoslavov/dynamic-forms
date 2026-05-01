import { randomUUID } from 'crypto';
import { DeepPartial } from 'typeorm';
import { FlowRun } from './entities/flow-run.entity';
import { Submission } from './entities/submission.entity';
import { Answer } from './entities/answer.entity';
import { FlowRunsRepository } from './flow-runs.repository';
import { FlowsRepository, RuleData } from '../builder/flows.repository';
import { FormsRepository } from '../builder/forms.repository';
import { Flow } from '../builder/entities/flow.entity';
import { FlowForm } from '../builder/entities/flow-form.entity';
import { Rule } from '../builder/entities/rule.entity';
import { Form } from '../builder/entities/form.entity';
import { Question } from '../builder/entities/question.entity';

export class FakeFlowRunsRepository implements FlowRunsRepository {
  flowRuns: FlowRun[] = [];
  submissions: Submission[] = [];

  async findAll(): Promise<FlowRun[]> {
    return this.flowRuns;
  }

  async findOne(id: string): Promise<FlowRun | null> {
    const run = this.flowRuns.find((r) => r.id === id) ?? null;
    if (run) {
      run.submissions = this.submissions.filter((s) => s.flowRunId === run.id);
    }
    return run;
  }

  async findByFlowAndUsername(flowId: string, username: string): Promise<FlowRun | null> {
    return this.flowRuns.find(
      (r) => r.flowId === flowId && r.username === username && r.status === 'in_progress',
    ) ?? null;
  }

  async create(data: { flowId: string; username: string }): Promise<FlowRun> {
    const run = Object.assign(new FlowRun(), {
      id: randomUUID(),
      flowId: data.flowId,
      username: data.username,
      status: 'in_progress',
      startedAt: new Date(),
      completedAt: null,
      submissions: [],
    });
    this.flowRuns.push(run);
    return run;
  }

  async complete(flowRun: FlowRun): Promise<FlowRun> {
    flowRun.status = 'completed';
    flowRun.completedAt = new Date();
    return flowRun;
  }

  async createSubmission(data: DeepPartial<Submission>): Promise<Submission> {
    const sub = Object.assign(new Submission(), {
      id: randomUUID(),
      formId: data.formId,
      flowRunId: data.flowRunId,
      submittedAt: new Date(),
      answers: ((data.answers as DeepPartial<Answer>[]) || []).map((a) =>
        Object.assign(new Answer(), { id: randomUUID(), ...a }),
      ),
    });
    this.submissions.push(sub);
    return sub;
  }
}

export class FakeFlowsRepository implements FlowsRepository {
  flows: Flow[] = [];

  async findAll(): Promise<Flow[]> {
    return this.flows;
  }

  async findOne(id: string): Promise<Flow | null> {
    return this.flows.find((f) => f.id === id) ?? null;
  }

  async createWithFormsAndRules(
    flowData: { name: string; description?: string },
    flowForms: { formId: string; order: number }[],
    rules: RuleData[],
  ): Promise<Flow> {
    const flow = Object.assign(new Flow(), {
      id: randomUUID(),
      ...flowData,
      flowForms: flowForms.map((ff) =>
        Object.assign(new FlowForm(), { flowId: '', formId: ff.formId, order: ff.order }),
      ),
      rules: rules.map((r) => Object.assign(new Rule(), { id: randomUUID(), flowId: '', ...r })),
    });
    flow.flowForms.forEach((ff) => (ff.flowId = flow.id));
    flow.rules.forEach((r) => (r.flowId = flow.id));
    this.flows.push(flow);
    return flow;
  }

  async updateWithFormsAndRules(
    id: string,
    flowData: { name: string; description: string },
    flowForms: { formId: string; order: number }[],
    rules: RuleData[],
  ): Promise<Flow> {
    const flow = this.flows.find((f) => f.id === id);
    if (!flow) throw new Error('Flow not found');
    Object.assign(flow, flowData);
    flow.flowForms = flowForms.map((ff) =>
      Object.assign(new FlowForm(), { flowId: id, formId: ff.formId, order: ff.order }),
    );
    flow.rules = rules.map((r) => Object.assign(new Rule(), { id: randomUUID(), flowId: id, ...r }));
    return flow;
  }

  async softRemove(id: string): Promise<boolean> {
    const idx = this.flows.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    this.flows.splice(idx, 1);
    return true;
  }
}

export class FakeFormsRepository implements FormsRepository {
  forms: Form[] = [];
  questions: Question[] = [];

  async findAll(): Promise<Form[]> {
    return this.forms;
  }

  async findOne(id: string): Promise<Form | null> {
    return this.forms.find((f) => f.id === id) ?? null;
  }

  async findByIds(ids: string[]): Promise<Form[]> {
    return this.forms.filter((f) => ids.includes(f.id));
  }

  async findQuestionsByIds(ids: string[]): Promise<Question[]> {
    return this.questions.filter((q) => ids.includes(q.id));
  }

  async findQuestionsByFormId(formId: string): Promise<Question[]> {
    return this.questions.filter((q) => q.formId === formId);
  }

  async create(data: DeepPartial<Form>): Promise<Form> {
    const form = Object.assign(new Form(), { id: randomUUID(), ...data });
    this.forms.push(form);
    return form;
  }

  async update(form: Form, _questionsToRemove: Question[]): Promise<Form> {
    return form;
  }

  async softRemove(): Promise<void> {}
}
