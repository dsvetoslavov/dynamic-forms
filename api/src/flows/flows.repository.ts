import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { FlowForm } from './entities/flow-form.entity';
import { Rule } from './entities/rule.entity';

export const FLOWS_REPOSITORY = Symbol('FLOWS_REPOSITORY');

export interface RuleData {
  sourceQuestionId: string;
  operator: string;
  triggerValue: string;
  targetQuestionId: string;
  actionType: string;
}

export interface FlowsRepository {
  findAll(): Promise<Flow[]>;
  findOne(id: string): Promise<Flow | null>;
  createWithFormsAndRules(
    flowData: { name: string; description?: string },
    flowForms: { formId: string; order: number }[],
    rules: RuleData[],
  ): Promise<Flow>;
  updateWithFormsAndRules(
    id: string,
    flowData: { name: string; description: string },
    flowForms: { formId: string; order: number }[],
    rules: RuleData[],
  ): Promise<Flow>;
  softRemove(id: string): Promise<boolean>;
}

@Injectable()
export class TypeOrmFlowsRepository implements FlowsRepository {
  constructor(
    @InjectRepository(Flow) private flowsRepo: Repository<Flow>,
    private dataSource: DataSource,
  ) {}

  findAll(): Promise<Flow[]> {
    return this.flowsRepo.find();
  }

  findOne(id: string): Promise<Flow | null> {
    return this.flowsRepo.findOne({
      where: { id },
      relations: ['flowForms', 'flowForms.form', 'rules'],
    });
  }

  async createWithFormsAndRules(
    flowData: { name: string; description?: string },
    flowForms: { formId: string; order: number }[],
    rules: RuleData[],
  ): Promise<Flow> {
    return this.dataSource.transaction(async (manager) => {
      const flow = manager.create(Flow, flowData);
      const savedFlow = await manager.save(flow);

      const ffEntities = flowForms.map((ff) =>
        manager.create(FlowForm, { flowId: savedFlow.id, formId: ff.formId, order: ff.order }),
      );
      await manager.save(ffEntities);

      if (rules.length) {
        const ruleEntities = rules.map((r) =>
          manager.create(Rule, { flowId: savedFlow.id, ...r }),
        );
        await manager.save(ruleEntities);
      }

      return savedFlow;
    });
  }

  async updateWithFormsAndRules(
    id: string,
    flowData: { name: string; description: string },
    flowForms: { formId: string; order: number }[],
    rules: RuleData[],
  ): Promise<Flow> {
    return this.dataSource.transaction(async (manager) => {
      const flow = await manager.findOneOrFail(Flow, {
        where: { id },
        relations: ['flowForms', 'rules'],
      });

      await manager.softDelete(Rule, { flowId: id });

      flow.name = flowData.name;
      flow.description = flowData.description;
      flow.flowForms = flowForms.map((ff) => ({ flowId: id, ...ff }) as FlowForm);
      flow.rules = rules.map((r) => ({ flowId: id, ...r }) as Rule);
      await manager.save(flow);

      return manager.findOneOrFail(Flow, {
        where: { id },
        relations: ['flowForms', 'flowForms.form', 'rules'],
      });
    });
  }

  async softRemove(id: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const result = await manager.softDelete(Flow, id);
      if ((result.affected ?? 0) === 0) return false;

      await manager.softDelete(Rule, { flowId: id });
      await manager.delete(FlowForm, { flowId: id });
      return true;
    });
  }
}
