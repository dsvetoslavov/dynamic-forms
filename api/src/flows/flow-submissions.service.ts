import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { Rule } from './entities/rule.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Question } from '../forms/entities/question.entity';
import { evaluateRules } from './rule-engine';

@Injectable()
export class FlowSubmissionsService {
  constructor(
    @InjectRepository(Flow) private flowsRepo: Repository<Flow>,
    @InjectRepository(Rule) private rulesRepo: Repository<Rule>,
    @InjectRepository(Submission) private submissionsRepo: Repository<Submission>,
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
  ) {}

  async getFormState(flowId: string, formId: string, username: string) {
    const flow = await this.loadFlowWithForms(flowId);
    this.assertFormInFlow(flow, formId);

    const rules = await this.rulesRepo.find({ where: { flowId } });
    const formQuestions = await this.questionsRepo.find({ where: { formId } });
    const allQuestionIds = formQuestions.map((q) => q.id);

    const answerContext = await this.buildAnswerContext(flowId, username, flow, formId);

    const enabled = evaluateRules(rules, answerContext, allQuestionIds);

    return { enabledQuestionIds: [...enabled] };
  }

  async submit(
    flowId: string,
    body: { formId: string; username: string; answers: { questionId: string; value: string }[] },
  ) {
    if (!body.formId) throw new BadRequestException('formId is required');
    if (!body.username?.trim()) throw new BadRequestException('username is required');

    const flow = await this.loadFlowWithForms(flowId);
    this.assertFormInFlow(flow, body.formId);

    const rules = await this.rulesRepo.find({ where: { flowId } });
    const formQuestions = await this.questionsRepo.find({ where: { formId: body.formId } });
    const allQuestionIds = formQuestions.map((q) => q.id);

    // Build context from prior submissions + current answers
    const priorContext = await this.buildAnswerContext(flowId, body.username, flow, body.formId);
    const currentAnswers: Record<string, string> = {};
    for (const a of body.answers || []) {
      currentAnswers[a.questionId] = a.value;
    }
    const fullContext = { ...priorContext, ...currentAnswers };

    const enabled = evaluateRules(rules, fullContext, allQuestionIds);

    // Reject answers to disabled questions
    for (const a of body.answers || []) {
      if (!enabled.has(a.questionId)) {
        throw new UnprocessableEntityException(
          `Answer for disabled question: ${a.questionId}`,
        );
      }
    }

    // Create submission
    const submission = this.submissionsRepo.create({
      formId: body.formId,
      flowId,
      username: body.username,
      answers: (body.answers || []).map((a) => ({
        questionId: a.questionId,
        value: a.value,
      })),
    });
    const saved = await this.submissionsRepo.save(submission);

    // Determine next form
    const sortedForms = flow.flowForms.sort((a, b) => a.order - b.order);
    const currentIndex = sortedForms.findIndex((ff) => ff.formId === body.formId);
    const nextFlowForm = sortedForms[currentIndex + 1] ?? null;

    const result: any = {
      submissionId: saved.id,
      isComplete: !nextFlowForm,
    };

    if (nextFlowForm) {
      const nextQuestions = await this.questionsRepo.find({
        where: { formId: nextFlowForm.formId },
      });
      const nextAllIds = nextQuestions.map((q) => q.id);

      // Re-evaluate with the just-submitted answers included
      const updatedContext = { ...priorContext, ...currentAnswers };
      const nextEnabled = evaluateRules(rules, updatedContext, nextAllIds);

      result.nextForm = {
        id: nextFlowForm.formId,
        name: nextFlowForm.form?.name ?? nextFlowForm.formId,
        order: nextFlowForm.order,
        questions: nextQuestions.sort((a, b) => a.order - b.order),
        enabledQuestionIds: [...nextEnabled],
      };
    }

    return result;
  }

  private async loadFlowWithForms(flowId: string): Promise<Flow> {
    const flow = await this.flowsRepo.findOne({
      where: { id: flowId },
      relations: ['flowForms', 'flowForms.form'],
    });
    if (!flow) throw new NotFoundException('Flow not found');
    return flow;
  }

  private assertFormInFlow(flow: Flow, formId: string): void {
    const found = flow.flowForms.some((ff) => ff.formId === formId);
    if (!found) {
      throw new BadRequestException(`Form ${formId} is not part of this flow`);
    }
  }

  private async buildAnswerContext(
    flowId: string,
    username: string,
    flow: Flow,
    upToFormId: string,
  ): Promise<Record<string, string>> {
    const sortedForms = flow.flowForms.sort((a, b) => a.order - b.order);
    const currentOrder = sortedForms.find((ff) => ff.formId === upToFormId)?.order ?? 0;
    const priorFormIds = sortedForms
      .filter((ff) => ff.order < currentOrder)
      .map((ff) => ff.formId);

    if (!priorFormIds.length) return {};

    const priorSubmissions = await this.submissionsRepo.find({
      where: priorFormIds.map((formId) => ({ formId, flowId, username })),
      relations: ['answers'],
      order: { submittedAt: 'DESC' },
    });

    const context: Record<string, string> = {};
    // Most recent submission per form wins
    for (const sub of priorSubmissions) {
      for (const ans of sub.answers) {
        if (!(ans.questionId in context)) {
          context[ans.questionId] = ans.value;
        }
      }
    }

    return context;
  }
}
