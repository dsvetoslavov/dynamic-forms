import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Flow } from './entities/flow.entity';
import { FlowForm } from './entities/flow-form.entity';
import { Rule } from './entities/rule.entity';
import { Form } from './entities/form.entity';
import { Question, QuestionType } from './entities/question.entity';
import { TypeOrmFlowsRepository } from './flows.repository';

describe('TypeOrmFlowsRepository', () => {
  let repo: TypeOrmFlowsRepository;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'postgres',
          database: 'dynamic_forms_test',
          entities: [Flow, FlowForm, Rule, Form, Question],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Flow, FlowForm, Rule, Form, Question]),
      ],
      providers: [TypeOrmFlowsRepository],
    }).compile();

    repo = module.get(TypeOrmFlowsRepository);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  async function createForm(name: string, questions: { label: string; type: QuestionType }[]): Promise<Form> {
    const formRepo = dataSource.getRepository(Form);
    const form = formRepo.create({
      name,
      questions: questions.map((q, i) => ({ ...q, order: i })),
    });
    return formRepo.save(form);
  }

  describe('createWithFormsAndRules', () => {
    it('creates a flow with forms and rules in a transaction', async () => {
      const formA = await createForm('Flow Test A', [
        { label: 'Source Q', type: QuestionType.YES_NO },
      ]);
      const formB = await createForm('Flow Test B', [
        { label: 'Target Q', type: QuestionType.TEXT },
      ]);

      const flow = await repo.createWithFormsAndRules(
        { name: 'Test Flow', description: 'A test flow' },
        [
          { formId: formA.id, order: 0 },
          { formId: formB.id, order: 1 },
        ],
        [
          {
            sourceQuestionId: formA.questions[0].id,
            triggerValue: 'yes',
            targetQuestionId: formB.questions[0].id,
          },
        ],
      );

      expect(flow.id).toBeDefined();
      expect(flow.name).toBe('Test Flow');

      const found = await repo.findOne(flow.id);
      expect(found).not.toBeNull();
      expect(found!.flowForms).toHaveLength(2);
      expect(found!.rules).toHaveLength(1);
      expect(found!.rules[0].triggerValue).toBe('yes');
    });
  });

  describe('findAll', () => {
    it('returns all flows', async () => {
      const flow = await repo.createWithFormsAndRules(
        { name: 'FindAll Flow' },
        [],
        [],
      );

      const flows = await repo.findAll();
      const ids = flows.map((f) => f.id);
      expect(ids).toContain(flow.id);
    });
  });

  describe('findOne', () => {
    it('returns null for nonexistent id', async () => {
      const found = await repo.findOne('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('updateWithFormsAndRules', () => {
    it('replaces forms and soft-deletes old rules', async () => {
      const formA = await createForm('Update Test A', [
        { label: 'UQ1', type: QuestionType.YES_NO },
      ]);
      const formB = await createForm('Update Test B', [
        { label: 'UQ2', type: QuestionType.TEXT },
      ]);

      const flow = await repo.createWithFormsAndRules(
        { name: 'Before Update' },
        [{ formId: formA.id, order: 0 }],
        [
          {
            sourceQuestionId: formA.questions[0].id,
            triggerValue: 'old',
            targetQuestionId: formA.questions[0].id,
          },
        ],
      );

      const oldRuleId = (await repo.findOne(flow.id))!.rules[0].id;

      const updated = await repo.updateWithFormsAndRules(
        flow.id,
        { name: 'After Update', description: 'Updated' },
        [
          { formId: formA.id, order: 0 },
          { formId: formB.id, order: 1 },
        ],
        [
          {
            sourceQuestionId: formA.questions[0].id,
            triggerValue: 'new',
            targetQuestionId: formB.questions[0].id,
          },
        ],
      );

      expect(updated.name).toBe('After Update');
      expect(updated.flowForms).toHaveLength(2);
      expect(updated.rules).toHaveLength(1);
      expect(updated.rules[0].triggerValue).toBe('new');

      // Old rule should be orphaned (flow_id nullified by orphanedRowAction)
      const orphaned = await dataSource.query(
        `SELECT id, flow_id, "deletedAt" FROM rules WHERE id = $1`,
        [oldRuleId],
      );
      expect(orphaned).toHaveLength(1);
      expect(orphaned[0].flow_id).not.toBeNull();
      expect(orphaned[0].deletedAt).not.toBeNull();
    });
  });

  describe('softRemove', () => {
    it('soft-deletes a flow', async () => {
      const flow = await repo.createWithFormsAndRules(
        { name: 'To Delete' },
        [],
        [],
      );

      const removed = await repo.softRemove(flow.id);
      expect(removed).toBe(true);

      const found = await repo.findOne(flow.id);
      expect(found).toBeNull();

      const raw = await dataSource.query(
        `SELECT id, "deletedAt" FROM flows WHERE id = $1`,
        [flow.id],
      );
      expect(raw).toHaveLength(1);
      expect(raw[0].deletedAt).not.toBeNull();
    });

    it('soft-deletes rules and hard-deletes flow forms', async () => {
      const formA = await createForm('SoftRemove A', [
        { label: 'SRQ1', type: QuestionType.YES_NO },
      ]);
      const formB = await createForm('SoftRemove B', [
        { label: 'SRQ2', type: QuestionType.TEXT },
      ]);

      const flow = await repo.createWithFormsAndRules(
        { name: 'Cascade Delete' },
        [
          { formId: formA.id, order: 0 },
          { formId: formB.id, order: 1 },
        ],
        [
          {
            sourceQuestionId: formA.questions[0].id,
            triggerValue: 'yes',
            targetQuestionId: formB.questions[0].id,
          },
        ],
      );

      const loaded = await repo.findOne(flow.id);
      const ruleId = loaded!.rules[0].id;

      await repo.softRemove(flow.id);

      // Rules should be soft-deleted
      const rules = await dataSource.query(
        `SELECT id, "deletedAt" FROM rules WHERE id = $1`,
        [ruleId],
      );
      expect(rules).toHaveLength(1);
      expect(rules[0].deletedAt).not.toBeNull();

      // FlowForms should be hard-deleted
      const flowForms = await dataSource.query(
        `SELECT * FROM flow_forms WHERE flow_id = $1`,
        [flow.id],
      );
      expect(flowForms).toHaveLength(0);
    });

    it('returns false for nonexistent id', async () => {
      const removed = await repo.softRemove('00000000-0000-0000-0000-000000000000');
      expect(removed).toBe(false);
    });
  });

});
