import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Form } from './entities/form.entity';
import { Question, QuestionType } from './entities/question.entity';
import { TypeOrmFormsRepository } from './forms.repository';

describe('TypeOrmFormsRepository', () => {
  let repo: TypeOrmFormsRepository;
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
          entities: [Form, Question],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Form, Question]),
      ],
      providers: [TypeOrmFormsRepository],
    }).compile();

    repo = module.get(TypeOrmFormsRepository);
    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  describe('create', () => {
    it('creates a form with questions', async () => {
      const form = await repo.create({
        name: 'Test Form',
        description: 'A test',
        questions: [
          { type: QuestionType.TEXT, label: 'Name', order: 0, config: {} },
          { type: QuestionType.NUMBER, label: 'Age', order: 1, config: { min: 0 } },
        ],
      });

      expect(form.id).toBeDefined();
      expect(form.name).toBe('Test Form');

      const found = await repo.findOne(form.id);
      expect(found).not.toBeNull();
      expect(found!.questions).toHaveLength(2);
      expect(found!.questions.map((q) => q.label).sort()).toEqual(['Age', 'Name']);
    });
  });

  describe('findAll', () => {
    it('returns all forms with questions', async () => {
      const formA = await repo.create({ name: 'Form A', questions: [{ type: QuestionType.TEXT, label: 'Q1', order: 0 }] });
      const formB = await repo.create({ name: 'Form B', questions: [{ type: QuestionType.YES_NO, label: 'Q2', order: 0 }] });

      const forms = await repo.findAll();
      const ids = forms.map((f) => f.id);
      expect(ids).toContain(formA.id);
      expect(ids).toContain(formB.id);
    });
  });

  describe('findOne', () => {
    it('returns null for nonexistent id', async () => {
      const found = await repo.findOne('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('saves form changes and soft-deletes removed questions in a transaction', async () => {
      const form = await repo.create({
        name: 'Original',
        questions: [
          { type: QuestionType.TEXT, label: 'Keep me', order: 0 },
          { type: QuestionType.TEXT, label: 'Remove me', order: 1 },
        ],
      });

      const loaded = await repo.findOne(form.id);
      const keepQuestion = loaded!.questions.find((q) => q.label === 'Keep me')!;
      const removeQuestion = loaded!.questions.find((q) => q.label === 'Remove me')!;

      loaded!.name = 'Updated';
      loaded!.questions = [
        keepQuestion,
        { type: QuestionType.NUMBER, label: 'New question', order: 1, formId: form.id } as Question,
      ];

      const updated = await repo.update(loaded!, [removeQuestion]);

      expect(updated.name).toBe('Updated');

      // Verify via fresh load
      const reloaded = await repo.findOne(form.id);
      expect(reloaded!.questions).toHaveLength(2);
      expect(reloaded!.questions.map((q) => q.label).sort()).toEqual(['Keep me', 'New question']);

      // Verify soft-deleted question still exists in DB but has deletedAt set
      const deleted = await dataSource.query(
        `SELECT id, "deletedAt" FROM questions WHERE id = $1`,
        [removeQuestion.id],
      );
      expect(deleted).toHaveLength(1);
      expect(deleted[0].deletedAt).not.toBeNull();
    });
  });

  describe('softRemove', () => {
    it('soft-deletes a form', async () => {
      const form = await repo.create({ name: 'To delete', questions: [] });

      await repo.softRemove(form);

      // Should not appear in normal find
      const found = await repo.findOne(form.id);
      expect(found).toBeNull();

      // But still exists in DB
      const raw = await dataSource.query(
        `SELECT id, "deletedAt" FROM forms WHERE id = $1`,
        [form.id],
      );
      expect(raw).toHaveLength(1);
      expect(raw[0].deletedAt).not.toBeNull();
    });
  });

  describe('findByIds', () => {
    it('returns forms matching the given ids', async () => {
      const formA = await repo.create({ name: 'FindByIds A', questions: [{ type: QuestionType.TEXT, label: 'Q1', order: 0 }] });
      const formB = await repo.create({ name: 'FindByIds B', questions: [{ type: QuestionType.TEXT, label: 'Q2', order: 0 }] });

      const found = await repo.findByIds([formA.id, formB.id]);
      const ids = found.map((f) => f.id);
      expect(ids).toContain(formA.id);
      expect(ids).toContain(formB.id);
    });
  });

  describe('findQuestionsByIds', () => {
    it('returns questions matching the given ids', async () => {
      const form = await repo.create({ name: 'FindQByIds', questions: [{ type: QuestionType.NUMBER, label: 'QQ', order: 0 }] });
      const loaded = await repo.findOne(form.id);
      const questionId = loaded!.questions[0].id;

      const found = await repo.findQuestionsByIds([questionId]);
      expect(found).toHaveLength(1);
      expect(found[0].label).toBe('QQ');
    });
  });
});
