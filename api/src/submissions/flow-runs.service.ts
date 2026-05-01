import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { FlowRun } from './entities/flow-run.entity';
import { evaluateRules } from './rule-engine';
import {
  FLOW_RUNS_REPOSITORY,
  type FlowRunsRepository,
} from './flow-runs.repository';
import {
  FLOWS_REPOSITORY,
  type FlowsRepository,
} from '../builder/flows.repository';
import {
  FORMS_REPOSITORY,
  type FormsRepository,
} from '../builder/forms.repository';
import { SubmitFlowRunDto } from './dto';

@Injectable()
export class FlowRunsService {
  constructor(
    @Inject(FLOW_RUNS_REPOSITORY) private flowRunsRepo: FlowRunsRepository,
    @Inject(FLOWS_REPOSITORY) private flowsRepo: FlowsRepository,
    @Inject(FORMS_REPOSITORY) private formsRepo: FormsRepository,
  ) {}

  async findAll() {
    return this.flowRunsRepo.findAll();
  }

  async findOne(runId: string) {
    return this.loadFlowRun(runId);
  }

  async create(flowId: string, username: string) {
    const existing = await this.flowRunsRepo.findByFlowAndUsername(flowId, username);
    if (existing) {
      throw new ConflictException('User already has an in-progress run for this flow');
    }

    const flow = await this.loadFlow(flowId);
    const flowRun = await this.flowRunsRepo.create({ flowId, username });

    const sortedForms = [...flow.flowForms].sort((a, b) => a.order - b.order);
    const firstFlowForm = sortedForms[0];
    if (!firstFlowForm) {
      throw new BadRequestException('Flow has no forms');
    }

    const questions = await this.formsRepo.findQuestionsByFormId(firstFlowForm.formId);
    const allQuestionIds = questions.map((q) => q.id);
    const enabled = evaluateRules(flow.rules, {}, allQuestionIds);

    return {
      flowRun,
      firstForm: {
        id: firstFlowForm.formId,
        name: firstFlowForm.form?.name ?? firstFlowForm.formId,
        order: firstFlowForm.order,
        questions: questions.sort((a, b) => a.order - b.order),
        enabledQuestionIds: [...enabled],
      },
    };
  }

  async getState(runId: string) {
    const flowRun = await this.loadFlowRun(runId);
    const flow = flowRun.flow;

    const sortedForms = [...flow.flowForms].sort((a, b) => a.order - b.order);
    const submittedFormIds = new Set(flowRun.submissions.map((s) => s.formId));
    const currentFlowForm = sortedForms.find((ff) => !submittedFormIds.has(ff.formId));

    if (!currentFlowForm) {
      return {
        username: flowRun.username,
        formId: null,
        formName: null,
        formOrder: 0,
        questions: [],
        enabledQuestionIds: [],
      };
    }

    const questions = await this.formsRepo.findQuestionsByFormId(currentFlowForm.formId);
    const questionIds = questions.map((q) => q.id);
    const answerContext = this.buildAnswerContext(flowRun);
    const enabled = evaluateRules(flow.rules, answerContext, questionIds);

    return {
      username: flowRun.username,
      formId: currentFlowForm.formId,
      formName: currentFlowForm.form?.name ?? currentFlowForm.formId,
      formOrder: currentFlowForm.order,
      questions: questions.sort((a, b) => a.order - b.order),
      enabledQuestionIds: [...enabled],
    };
  }

  async submit(runId: string, body: SubmitFlowRunDto) {
    const flowRun = await this.loadFlowRun(runId);
    if (flowRun.status === 'completed') {
      throw new BadRequestException('Flow run is already completed');
    }

    const alreadySubmitted = (flowRun.submissions || []).some((s) => s.formId === body.formId);
    if (alreadySubmitted) {
      throw new BadRequestException('Form already submitted in this run');
    }

    if (!body.answers?.length) {
      throw new BadRequestException('Submission must include at least one answer');
    }

    const flow = flowRun.flow;
    this.assertFormInFlow(flow, body.formId);

    // Validate submitted form is the next expected form
    const sortedForms = [...flow.flowForms].sort((a, b) => a.order - b.order);
    const submittedFormIds = new Set((flowRun.submissions || []).map((s) => s.formId));
    const expectedForm = sortedForms.find((ff) => !submittedFormIds.has(ff.formId));
    if (!expectedForm || expectedForm.formId !== body.formId) {
      throw new BadRequestException('Form is not the next expected form in this flow');
    }

    const formQuestions = await this.formsRepo.findQuestionsByFormId(body.formId);
    const questionIds = formQuestions.map((q) => q.id);

    // Build context from prior submissions + current answers
    const priorContext = this.buildAnswerContext(flowRun);
    const currentAnswers: Record<string, string> = {};
    for (const a of body.answers || []) {
      currentAnswers[a.questionId] = a.value;
    }
    const fullContext = { ...priorContext, ...currentAnswers };

    const enabled = evaluateRules(flow.rules, fullContext, questionIds);

    // Reject answers to disabled questions
    for (const a of body.answers || []) {
      if (!enabled.has(a.questionId)) {
        throw new UnprocessableEntityException(
          `Answer for disabled question: ${a.questionId}`,
        );
      }
    }

    // Create submission
    const saved = await this.flowRunsRepo.createSubmission({
      formId: body.formId,
      flowRunId: runId,
      answers: (body.answers || []).map((a) => ({
        questionId: a.questionId,
        value: a.value,
      })),
    });

    // Determine next form
    submittedFormIds.add(body.formId);
    const nextFlowForm = sortedForms.find((ff) => !submittedFormIds.has(ff.formId)) ?? null;

    if (!nextFlowForm) {
      await this.flowRunsRepo.complete(flowRun);
      return { submissionId: saved.id, isComplete: true as const };
    }

    const nextQuestions = await this.formsRepo.findQuestionsByFormId(nextFlowForm.formId);
    const nextIds = nextQuestions.map((q) => q.id);
    const nextEnabled = evaluateRules(flow.rules, fullContext, nextIds);

    return {
      submissionId: saved.id,
      isComplete: false as const,
      nextForm: {
        id: nextFlowForm.formId,
        name: nextFlowForm.form?.name ?? nextFlowForm.formId,
        order: nextFlowForm.order,
        questions: nextQuestions.sort((a, b) => a.order - b.order),
        enabledQuestionIds: [...nextEnabled],
      },
    };
  }

  private async loadFlowRun(runId: string): Promise<FlowRun> {
    const flowRun = await this.flowRunsRepo.findOne(runId);
    if (!flowRun) throw new NotFoundException('Flow run not found');
    return flowRun;
  }

  private async loadFlow(flowId: string) {
    const flow = await this.flowsRepo.findOne(flowId);
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  private assertFormInFlow(flow: { flowForms: { formId: string }[] }, formId: string): void {
    const found = flow.flowForms.some((ff) => ff.formId === formId);
    if (!found) {
      throw new BadRequestException(`Form ${formId} is not part of this flow`);
    }
  }

  private buildAnswerContext(flowRun: FlowRun): Record<string, string> {
    const context: Record<string, string> = {};
    const sorted = [...(flowRun.submissions || [])].sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
    for (const sub of sorted) {
      for (const ans of sub.answers) {
        if (!(ans.questionId in context)) {
          context[ans.questionId] = ans.value;
        }
      }
    }
    return context;
  }
}
