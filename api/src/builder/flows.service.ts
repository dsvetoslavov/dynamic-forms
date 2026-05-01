import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Flow } from './entities/flow.entity';
import { Question } from './entities/question.entity';
import { validateRuleGraph, validateRuleOrdering } from './rule-validation';
import { FLOWS_REPOSITORY } from './flows.repository';
import { type FlowsRepository, type RuleData } from './flows.repository';
import { FORMS_REPOSITORY } from './forms.repository';
import { type FormsRepository } from './forms.repository';

@Injectable()
export class FlowsService {
  constructor(
    @Inject(FLOWS_REPOSITORY) private flowsRepo: FlowsRepository,
    @Inject(FORMS_REPOSITORY) private formsRepo: FormsRepository,
  ) {}

  findAll(): Promise<Flow[]> {
    return this.flowsRepo.findAll();
  }

  async findOne(id: string): Promise<Flow> {
    const flow = await this.flowsRepo.findOne(id);
    if (!flow) throw new NotFoundException();
    return flow;
  }

  async create(data: {
    name: string;
    description?: string;
    formIds: string[];
    rules?: { sourceQuestionId: string; triggerValue: string; targetQuestionId: string; }[];
  }): Promise<Flow> {
    const formOrderMap = await this.validateForms(data.formIds);

    const normalizedRules = data.rules?.length
      ? await this.validateRules(data.rules, formOrderMap)
      : [];

    const flowForms = data.formIds.map((formId, index) => ({ formId, order: index }));

    return this.flowsRepo.createWithFormsAndRules(
      { name: data.name, description: data.description },
      flowForms,
      normalizedRules,
    );
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      formIds: string[];
      rules?: { sourceQuestionId: string; triggerValue: string; targetQuestionId: string; }[];
    },
  ): Promise<Flow> {
    const existing = await this.flowsRepo.findOne(id);
    if (!existing) throw new NotFoundException();

    const formOrderMap = await this.validateForms(data.formIds);

    const normalizedRules = data.rules?.length
      ? await this.validateRules(data.rules, formOrderMap)
      : [];

    const flowForms = data.formIds.map((formId, index) => ({ formId, order: index }));

    return this.flowsRepo.updateWithFormsAndRules(
      id,
      { name: data.name ?? existing.name, description: data.description ?? existing.description },
      flowForms,
      normalizedRules,
    );
  }

  async remove(id: string): Promise<void> {
    const removed = await this.flowsRepo.softRemove(id);
    if (!removed) throw new NotFoundException();
  }

  private async validateForms(formIds: string[]): Promise<Map<string, number>> {
    if (!formIds?.length) {
      throw new BadRequestException('At least one form is required');
    }

    const forms = await this.formsRepo.findByIds(formIds);

    if (forms.length !== formIds.length) {
      const found = new Set(forms.map((f) => f.id));
      const missing = formIds.filter((id) => !found.has(id));
      throw new BadRequestException(`Forms not found: ${missing.join(', ')}`);
    }

    const map = new Map<string, number>();
    formIds.forEach((id, index) => map.set(id, index));
    return map;
  }

  private async validateRules(
    rules: { sourceQuestionId: string; triggerValue: string; targetQuestionId: string; }[],
    formOrderMap: Map<string, number>,
  ): Promise<RuleData[]> {
    try {
      validateRuleGraph(rules);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const questionIds = rules.flatMap((r) => [r.sourceQuestionId, r.targetQuestionId]);
    const questions = await this.formsRepo.findQuestionsByIds(questionIds);
    const questionMap = new Map<string, Question>(questions.map((q) => [q.id, q]));

    for (const rule of rules) {
      const source = questionMap.get(rule.sourceQuestionId);
      const target = questionMap.get(rule.targetQuestionId);

      if (!source) {
        throw new BadRequestException(`Source question not found: ${rule.sourceQuestionId}`);
      }
      if (!target) {
        throw new BadRequestException(`Target question not found: ${rule.targetQuestionId}`);
      }

      const sourceOrder = formOrderMap.get(source.formId);
      const targetOrder = formOrderMap.get(target.formId);

      if (sourceOrder === undefined) {
        throw new BadRequestException(
          `Source question ${rule.sourceQuestionId} belongs to a form not in this flow`,
        );
      }
      if (targetOrder === undefined) {
        throw new BadRequestException(
          `Target question ${rule.targetQuestionId} belongs to a form not in this flow`,
        );
      }
    }

    try {
      validateRuleOrdering(
        rules.map((r) => {
          const source = questionMap.get(r.sourceQuestionId)!;
          const target = questionMap.get(r.targetQuestionId)!;
          return {
            sourceQuestionId: r.sourceQuestionId,
            targetQuestionId: r.targetQuestionId,
            sourceFormOrder: formOrderMap.get(source.formId)!,
            targetFormOrder: formOrderMap.get(target.formId)!,
            sourceQuestionOrder: source.order,
            targetQuestionOrder: target.order,
          };
        }),
      );
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    return rules.map((r) => ({
      sourceQuestionId: r.sourceQuestionId,
      triggerValue: r.triggerValue,
      targetQuestionId: r.targetQuestionId,
    }));
  }
}
