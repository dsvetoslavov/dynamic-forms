import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { FlowForm } from './entities/flow-form.entity';
import { Rule } from './entities/rule.entity';
import { Question } from '../forms/entities/question.entity';
import { Form } from '../forms/entities/form.entity';
import { CreateFlowDto, UpdateFlowDto, CreateRuleDto } from './dto';

@Injectable()
export class FlowsService {
  constructor(
    @InjectRepository(Flow) private flowsRepo: Repository<Flow>,
    @InjectRepository(FlowForm) private flowFormsRepo: Repository<FlowForm>,
    @InjectRepository(Rule) private rulesRepo: Repository<Rule>,
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
    private dataSource: DataSource,
  ) {}

  findAll(): Promise<Flow[]> {
    return this.flowsRepo.find();
  }

  async findOne(id: string): Promise<any> {
    const flow = await this.flowsRepo.findOne({
      where: { id },
      relations: ['flowForms', 'flowForms.form', 'rules'],
    });
    if (!flow) throw new NotFoundException();

    return {
      id: flow.id,
      name: flow.name,
      description: flow.description,
      forms: flow.flowForms
        .sort((a, b) => a.order - b.order)
        .map((ff) => ({ id: ff.formId, name: ff.form.name, order: ff.order })),
      rules: flow.rules,
      createdAt: flow.createdAt,
      updatedAt: flow.updatedAt,
    };
  }

  async create(data: CreateFlowDto) {
    return this.dataSource.transaction(async (manager) => {
      const formOrderMap = await this.validateForms(data.formIds);

      const flow = manager.create(Flow, {
        name: data.name,
        description: data.description,
      });
      const savedFlow = await manager.save(flow);

      const flowForms = data.formIds.map((formId, index) =>
        manager.create(FlowForm, {
          flowId: savedFlow.id,
          formId,
          order: index,
        }),
      );
      await manager.save(flowForms);

      if (data.rules?.length) {
        await this.validateAndSaveRules(
          manager,
          savedFlow.id,
          data.rules,
          formOrderMap,
        );
      }

      return savedFlow;
    });
  }

  async update(id: string, data: UpdateFlowDto) {
    const existing = await this.flowsRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException();

    return this.dataSource.transaction(async (manager) => {
      await manager.update(Flow, id, {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
      });

      const formOrderMap = await this.validateForms(data.formIds);

      await manager.delete(FlowForm, { flowId: id });
      const flowForms = data.formIds.map((formId, index) =>
        manager.create(FlowForm, {
          flowId: id,
          formId,
          order: index,
        }),
      );
      await manager.save(flowForms);

      await manager.softDelete(Rule, { flowId: id });
      if (data.rules?.length) {
        await this.validateAndSaveRules(manager, id, data.rules, formOrderMap);
      }

      return this.findOne(id);
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.flowsRepo.softDelete(id);
    if (result.affected === 0) throw new NotFoundException();
  }

  private async validateForms(
    formIds: string[],
  ): Promise<Map<string, number>> {
    if (!formIds?.length) {
      throw new BadRequestException('At least one form is required');
    }

    const forms = await this.dataSource.getRepository(Form).find({
      where: { id: In(formIds) },
    });

    if (forms.length !== formIds.length) {
      const found = new Set(forms.map((f) => f.id));
      const missing = formIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Forms not found: ${missing.join(', ')}`,
      );
    }

    const map = new Map<string, number>();
    formIds.forEach((id, index) => map.set(id, index));
    return map;
  }

  private async validateAndSaveRules(
    manager: any,
    flowId: string,
    rules: CreateRuleDto[],
    formOrderMap: Map<string, number>,
  ) {
    const questionIds = rules.flatMap((r) => [
      r.sourceQuestionId,
      r.targetQuestionId,
    ]);

    const questions = await this.questionsRepo.find({
      where: { id: In(questionIds) },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    for (const rule of rules) {
      const source = questionMap.get(rule.sourceQuestionId);
      const target = questionMap.get(rule.targetQuestionId);

      if (!source) {
        throw new BadRequestException(
          `Source question not found: ${rule.sourceQuestionId}`,
        );
      }
      if (!target) {
        throw new BadRequestException(
          `Target question not found: ${rule.targetQuestionId}`,
        );
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
      if (targetOrder < sourceOrder) {
        throw new BadRequestException(
          `Target question's form must be at the same position or later than source question's form`,
        );
      }
    }

    const ruleEntities = rules.map((r) =>
      manager.create(Rule, {
        flowId,
        sourceQuestionId: r.sourceQuestionId,
        operator: r.operator || '=',
        triggerValue: r.triggerValue,
        targetQuestionId: r.targetQuestionId,
        actionType: r.actionType || 'enable_target',
      }),
    );

    await manager.save(ruleEntities);
  }
}
