import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('Dynamic Forms API (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM answers');
    await dataSource.query('DELETE FROM submissions');
    await dataSource.query('DELETE FROM rules');
    await dataSource.query('DELETE FROM questions');
    await dataSource.query('DELETE FROM forms');
    await app.close();
  });

  let formId: string;
  let questionIds: Record<string, string>;
  let ruleId: string;
  let submissionId: string;

  it('POST /forms — create a form with questions', async () => {
    const res = await request(app.getHttpServer())
      .post('/forms')
      .send({
        name: 'Employee Survey',
        description: 'Annual survey',
        questions: [
          {
            type: 'text',
            label: 'Full name',
            order: 0,
            required: true,
            config: { placeholder: 'Enter your name' },
          },
          {
            type: 'yes_no',
            label: 'Are you a manager?',
            order: 1,
            required: true,
            config: {},
          },
          {
            type: 'number',
            label: 'Team size',
            order: 2,
            required: false,
            config: { min: 1, max: 100 },
          },
          {
            type: 'select',
            label: 'Department',
            order: 3,
            required: true,
            config: { options: ['Engineering', 'Sales', 'HR'] },
          },
        ],
      })
      .expect(201);

    formId = res.body.id;
    expect(formId).toBeDefined();
    expect(res.body.questions).toHaveLength(4);

    questionIds = {};
    for (const q of res.body.questions) {
      questionIds[q.label] = q.id;
    }
  });

  it('GET /forms — lists the created form', async () => {
    const res = await request(app.getHttpServer()).get('/forms').expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body.find((f: any) => f.id === formId)).toBeDefined();
  });

  it('GET /forms/:id — returns form with questions', async () => {
    const res = await request(app.getHttpServer())
      .get(`/forms/${formId}`)
      .expect(200);

    expect(res.body.id).toBe(formId);
    expect(res.body.questions).toHaveLength(4);
    expect(res.body.questions[0].config).toBeDefined();
  });

  it('PUT /forms/:id — updates the form', async () => {
    const res = await request(app.getHttpServer())
      .put(`/forms/${formId}`)
      .send({ name: 'Employee Survey 2026' })
      .expect(200);

    expect(res.body.name).toBe('Employee Survey 2026');
  });

  it('POST /forms/:formId/rules — create a rule', async () => {
    const res = await request(app.getHttpServer())
      .post(`/forms/${formId}/rules`)
      .send({
        sourceQuestionId: questionIds['Are you a manager?'],
        operator: '=',
        triggerValue: 'true',
        targetQuestionId: questionIds['Team size'],
        action: 'enable',
      })
      .expect(201);

    ruleId = res.body.id;
    expect(ruleId).toBeDefined();
    expect(res.body.formId).toBe(formId);
  });

  it('GET /forms/:formId/rules — lists rules', async () => {
    const res = await request(app.getHttpServer())
      .get(`/forms/${formId}/rules`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(ruleId);
  });

  it('POST /submissions — submit answers', async () => {
    const res = await request(app.getHttpServer())
      .post('/submissions')
      .send({
        formId,
        username: 'alice',
        answers: [
          { questionId: questionIds['Full name'], value: 'Alice Smith' },
          { questionId: questionIds['Are you a manager?'], value: 'true' },
          { questionId: questionIds['Team size'], value: '5' },
          { questionId: questionIds['Department'], value: 'Engineering' },
        ],
      })
      .expect(201);

    submissionId = res.body.id;
    expect(submissionId).toBeDefined();
    expect(res.body.answers).toHaveLength(4);
  });

  it('GET /submissions/:id — returns submission with answers', async () => {
    const res = await request(app.getHttpServer())
      .get(`/submissions/${submissionId}`)
      .expect(200);

    expect(res.body.id).toBe(submissionId);
    expect(res.body.formId).toBe(formId);
    expect(res.body.answers).toHaveLength(4);

    const nameAnswer = res.body.answers.find(
      (a: any) => a.questionId === questionIds['Full name'],
    );
    expect(nameAnswer.value).toBe('Alice Smith');
  });

  it('GET /submissions — lists all submissions', async () => {
    const res = await request(app.getHttpServer())
      .get('/submissions')
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('DELETE /forms/:formId/rules/:ruleId — deletes the rule', async () => {
    await request(app.getHttpServer())
      .delete(`/forms/${formId}/rules/${ruleId}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get(`/forms/${formId}/rules`)
      .expect(200);

    expect(res.body).toHaveLength(0);
  });

  it('GET /forms/:id — 404 for nonexistent form', async () => {
    await request(app.getHttpServer())
      .get('/forms/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
