import { NotFoundException, BadRequestException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { FlowRunsService } from './flow-runs.service';
import { FakeFlowRunsRepository, FakeFlowsRepository, FakeFormsRepository } from './fakes';
import { FlowRun } from './entities/flow-run.entity';
import { Flow } from '../flows/entities/flow.entity';
import { FlowForm } from '../flows/entities/flow-form.entity';
import { Rule } from '../flows/entities/rule.entity';
import { Form } from '../forms/entities/form.entity';
import { Question, QuestionType } from '../forms/entities/question.entity';
import { Submission } from './entities/submission.entity';
import { Answer } from './entities/answer.entity';

function makeQuestion(overrides: Partial<Question> & { id: string; formId: string }): Question {
  return Object.assign(new Question(), {
    type: QuestionType.TEXT,
    label: 'Q',
    order: 1,
    required: false,
    config: {},
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  });
}

function makeFlow(opts: {
  id: string;
  forms: { formId: string; order: number; formName?: string }[];
  rules?: Partial<Rule>[];
}): { flow: Flow; flowForms: FlowForm[] } {
  const flowForms = opts.forms.map((f) =>
    Object.assign(new FlowForm(), {
      flowId: opts.id,
      formId: f.formId,
      order: f.order,
      form: Object.assign(new Form(), { id: f.formId, name: f.formName ?? f.formId }),
    }),
  );
  const rules = (opts.rules || []).map((r) =>
    Object.assign(new Rule(), {
      id: 'rule-' + Math.random().toString(36).slice(2, 8),
      flowId: opts.id,
      operator: '=',
      actionType: 'enable_target',
      ...r,
    }),
  );
  const flow = Object.assign(new Flow(), {
    id: opts.id,
    name: 'Test Flow',
    flowForms,
    rules,
  });
  return { flow, flowForms };
}

function makeFlowRun(flow: Flow, username = 'alice'): FlowRun {
  return Object.assign(new FlowRun(), {
    id: 'run-' + Math.random().toString(36).slice(2, 8),
    flowId: flow.id,
    username,
    status: 'in_progress',
    startedAt: new Date(),
    completedAt: null,
    flow,
    submissions: [],
  });
}

function makeSubmission(runId: string, formId: string, answers: { questionId: string; value: string }[]): Submission {
  return Object.assign(new Submission(), {
    id: 'sub-' + Math.random().toString(36).slice(2, 8),
    formId,
    flowRunId: runId,
    submittedAt: new Date(),
    answers: answers.map((a) =>
      Object.assign(new Answer(), { id: 'ans-' + Math.random().toString(36).slice(2, 8), ...a }),
    ),
  });
}

describe('FlowRunsService', () => {
  let service: FlowRunsService;
  let flowRunsRepo: FakeFlowRunsRepository;
  let flowsRepo: FakeFlowsRepository;
  let formsRepo: FakeFormsRepository;

  beforeEach(() => {
    flowRunsRepo = new FakeFlowRunsRepository();
    flowsRepo = new FakeFlowsRepository();
    formsRepo = new FakeFormsRepository();
    service = new FlowRunsService(flowRunsRepo, flowsRepo, formsRepo);
  });

  describe('getState', () => {
    it('returns first form when no submissions', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(
        makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }),
        makeQuestion({ id: 'q2', formId: 'form-a', order: 2 }),
      );

      const state = await service.getState(run.id);
      expect(state.formId).toBe('form-a');
      expect(state.questions).toHaveLength(2);
      expect(state.enabledQuestionIds).toEqual(expect.arrayContaining(['q1', 'q2']));
    });

    it('returns second form after first submission', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);
      flowRunsRepo.submissions.push(makeSubmission(run.id, 'form-a', [{ questionId: 'q1', value: 'hi' }]));

      formsRepo.questions.push(makeQuestion({ id: 'q3', formId: 'form-b', order: 1 }));

      const state = await service.getState(run.id);
      expect(state.formId).toBe('form-b');
      expect(state.questions).toHaveLength(1);
    });

    it('returns null formId when all forms submitted', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);
      flowRunsRepo.submissions.push(makeSubmission(run.id, 'form-a', []));

      const state = await service.getState(run.id);
      expect(state.formId).toBeNull();
      expect(state.questions).toEqual([]);
    });

    it('enables target when cross-form rule condition is met', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }],
        rules: [{ sourceQuestionId: 'q1', targetQuestionId: 'q3', triggerValue: 'yes' }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);
      flowRunsRepo.submissions.push(makeSubmission(run.id, 'form-a', [{ questionId: 'q1', value: 'yes' }]));

      formsRepo.questions.push(
        makeQuestion({ id: 'q3', formId: 'form-b', order: 1 }),
        makeQuestion({ id: 'q4', formId: 'form-b', order: 2 }),
      );

      const state = await service.getState(run.id);
      expect(state.formId).toBe('form-b');
      expect(state.enabledQuestionIds).toContain('q3');
      expect(state.enabledQuestionIds).toContain('q4');
    });

    it('keeps target disabled when cross-form rule condition not met', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }],
        rules: [{ sourceQuestionId: 'q1', targetQuestionId: 'q3', triggerValue: 'yes' }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);
      flowRunsRepo.submissions.push(makeSubmission(run.id, 'form-a', [{ questionId: 'q1', value: 'no' }]));

      formsRepo.questions.push(
        makeQuestion({ id: 'q3', formId: 'form-b', order: 1 }),
        makeQuestion({ id: 'q4', formId: 'form-b', order: 2 }),
      );

      const state = await service.getState(run.id);
      expect(state.enabledQuestionIds).not.toContain('q3');
      expect(state.enabledQuestionIds).toContain('q4');
    });

    it('throws NotFoundException for invalid runId', async () => {
      await expect(service.getState('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('submit', () => {
    it('creates submission and returns next form', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(
        makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }),
        makeQuestion({ id: 'q2', formId: 'form-b', order: 1 }),
      );

      const result = await service.submit(run.id, { formId: 'form-a', answers: [{ questionId: 'q1', value: 'hi' }] });
      expect(result.isComplete).toBe(false);
      expect(result.submissionId).toBeDefined();
      if (!result.isComplete) {
        expect(result.nextForm.id).toBe('form-b');
      }
    });

    it('completes run on last form submission', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }));

      const result = await service.submit(run.id, { formId: 'form-a', answers: [{ questionId: 'q1', value: 'done' }] });
      expect(result.isComplete).toBe(true);
      expect(run.status).toBe('completed');
    });

    it('rejects duplicate form submission', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);
      flowRunsRepo.submissions.push(makeSubmission(run.id, 'form-a', []));

      await expect(
        service.submit(run.id, { formId: 'form-a', answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects already-completed run', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      run.status = 'completed';
      flowRunsRepo.flowRuns.push(run);

      await expect(
        service.submit(run.id, { formId: 'form-a', answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects answers to disabled questions', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }],
        rules: [{ sourceQuestionId: 'q-other', targetQuestionId: 'q1', triggerValue: 'yes' }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }));

      await expect(
        service.submit(run.id, { formId: 'form-a', answers: [{ questionId: 'q1', value: 'hi' }] }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException for invalid runId', async () => {
      await expect(
        service.submit('nonexistent', { formId: 'form-a', answers: [{ questionId: 'q1', value: 'hi' }] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects form not part of the flow', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      await expect(
        service.submit(run.id, { formId: 'form-x', answers: [{ questionId: 'q1', value: 'hi' }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects submission with no answers', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }));

      await expect(
        service.submit(run.id, { formId: 'form-a', answers: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects submitting out-of-order form', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(makeQuestion({ id: 'q2', formId: 'form-b', order: 1 }));

      await expect(
        service.submit(run.id, { formId: 'form-b', answers: [{ questionId: 'q2', value: 'hi' }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows current answers to enable same-form questions via rules', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }],
        rules: [{ sourceQuestionId: 'q1', targetQuestionId: 'q2', triggerValue: 'yes' }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(
        makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }),
        makeQuestion({ id: 'q2', formId: 'form-a', order: 2 }),
      );

      const result = await service.submit(run.id, {
        formId: 'form-a',
        answers: [{ questionId: 'q1', value: 'yes' }, { questionId: 'q2', value: 'enabled!' }],
      });
      expect(result.isComplete).toBe(true);
    });

    it('keeps next form target disabled when rule condition not met', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }],
        rules: [{ sourceQuestionId: 'q1', targetQuestionId: 'q3', triggerValue: 'yes' }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(
        makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }),
        makeQuestion({ id: 'q3', formId: 'form-b', order: 1 }),
        makeQuestion({ id: 'q4', formId: 'form-b', order: 2 }),
      );

      const result = await service.submit(run.id, { formId: 'form-a', answers: [{ questionId: 'q1', value: 'no' }] });
      expect(result.isComplete).toBe(false);
      if (!result.isComplete) {
        expect(result.nextForm.enabledQuestionIds).not.toContain('q3');
        expect(result.nextForm.enabledQuestionIds).toContain('q4');
      }
    });

    it('persists submission in the repository', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }] });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(
        makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }),
        makeQuestion({ id: 'q2', formId: 'form-b', order: 1 }),
      );

      await service.submit(run.id, { formId: 'form-a', answers: [{ questionId: 'q1', value: 'saved' }] });

      expect(flowRunsRepo.submissions).toHaveLength(1);
      expect(flowRunsRepo.submissions[0].formId).toBe('form-a');
      expect(flowRunsRepo.submissions[0].answers[0].value).toBe('saved');
    });

    it('evaluates rules for next form using full answer context', async () => {
      const { flow } = makeFlow({
        id: 'f1',
        forms: [{ formId: 'form-a', order: 1 }, { formId: 'form-b', order: 2 }],
        rules: [{ sourceQuestionId: 'q1', targetQuestionId: 'q2', triggerValue: 'yes' }],
      });
      flowsRepo.flows.push(flow);

      const run = makeFlowRun(flow);
      flowRunsRepo.flowRuns.push(run);

      formsRepo.questions.push(
        makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }),
        makeQuestion({ id: 'q2', formId: 'form-b', order: 1 }),
        makeQuestion({ id: 'q3', formId: 'form-b', order: 2 }),
      );

      const result = await service.submit(run.id, { formId: 'form-a', answers: [{ questionId: 'q1', value: 'yes' }] });
      expect(result.isComplete).toBe(false);
      if (!result.isComplete) {
        expect(result.nextForm.enabledQuestionIds).toContain('q2');
        expect(result.nextForm.enabledQuestionIds).toContain('q3');
      }
    });
  });

  describe('create', () => {
    it('creates a new run and returns first form', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1, formName: 'Form A' }] });
      flowsRepo.flows.push(flow);

      formsRepo.questions.push(makeQuestion({ id: 'q1', formId: 'form-a', order: 1 }));

      const result = await service.create('f1', 'alice');
      expect(result.flowRun.flowId).toBe('f1');
      expect(result.flowRun.username).toBe('alice');
      expect(result.firstForm.id).toBe('form-a');
      expect(result.firstForm.questions).toHaveLength(1);
    });

    it('throws ConflictException for duplicate in-progress run', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [{ formId: 'form-a', order: 1 }] });
      flowsRepo.flows.push(flow);

      const existing = makeFlowRun(flow, 'alice');
      flowRunsRepo.flowRuns.push(existing);

      await expect(service.create('f1', 'alice')).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException for flow with no forms', async () => {
      const { flow } = makeFlow({ id: 'f1', forms: [] });
      flowsRepo.flows.push(flow);

      await expect(service.create('f1', 'alice')).rejects.toThrow(BadRequestException);
    });
  });
});
