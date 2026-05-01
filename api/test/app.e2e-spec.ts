import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // Shared state across tests
  let formAId: string;
  let formBId: string;
  let formCId: string;
  let formAQuestions: Record<string, string> = {};
  let formBQuestions: Record<string, string> = {};

  let flowId: string;
  let flowWithRulesId: string;

  let runId: string;
  let bobRunId: string;

  // ─── Forms ───────────────────────────────────────────────────────────

  describe('Forms', () => {
    it('POST /forms — create Form A with 3 questions', async () => {
      const res = await request(app.getHttpServer())
        .post('/forms')
        .send({
          name: 'Intake Form',
          description: 'Employee intake',
          questions: [
            { type: 'text', label: 'Full name', order: 0, config: { placeholder: 'Enter name' } },
            { type: 'yes_no', label: 'Is manager?', order: 1 },
            { type: 'number', label: 'Team size', order: 2, config: { min: 1, max: 50 } },
          ],
        })
        .expect(201);

      formAId = res.body.id;
      expect(formAId).toBeDefined();
      expect(res.body.questions).toHaveLength(3);
      for (const q of res.body.questions) {
        formAQuestions[q.label] = q.id;
      }
    });

    it('POST /forms — create Form B with 2 questions', async () => {
      const res = await request(app.getHttpServer())
        .post('/forms')
        .send({
          name: 'Manager Details',
          questions: [
            { type: 'text', label: 'Department', order: 0 },
            { type: 'number', label: 'Budget', order: 1, config: { min: 0 } },
          ],
        })
        .expect(201);

      formBId = res.body.id;
      expect(res.body.questions).toHaveLength(2);
      for (const q of res.body.questions) {
        formBQuestions[q.label] = q.id;
      }
    });

    it('GET /forms — lists both forms', async () => {
      const res = await request(app.getHttpServer()).get('/forms').expect(200);

      const ids = res.body.map((f: any) => f.id);
      expect(ids).toContain(formAId);
      expect(ids).toContain(formBId);
    });

    it('GET /forms/:id — returns Form A with questions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/forms/${formAId}`)
        .expect(200);

      expect(res.body.id).toBe(formAId);
      expect(res.body.name).toBe('Intake Form');
      expect(res.body.questions).toHaveLength(3);
      expect(res.body.questions[0].config).toBeDefined();
    });

    it('PUT /forms/:id — update Form A: rename + replace questions', async () => {
      const res = await request(app.getHttpServer())
        .put(`/forms/${formAId}`)
        .send({
          name: 'Intake Form v2',
          questions: [
            { id: formAQuestions['Full name'], type: 'text', label: 'Full name', order: 0, config: { placeholder: 'Enter name' } },
            { type: 'yes_no', label: 'Is manager?', order: 1 },
            { type: 'select', label: 'Team size range', order: 2, config: { options: ['1-10', '11-50', '50+'] } },
          ],
        })
        .expect(200);

      expect(res.body.name).toBe('Intake Form v2');
      expect(res.body.questions).toHaveLength(3);

      // Full name keeps its ID, others are new
      const updated: Record<string, string> = {};
      for (const q of res.body.questions) {
        updated[q.label] = q.id;
      }
      expect(updated['Full name']).toBe(formAQuestions['Full name']);
      expect(updated['Is manager?']).not.toBe(formAQuestions['Is manager?']);
      expect(updated['Team size range']).toBeDefined();

      formAQuestions = updated;
    });

    it('GET /forms/:id — verify updated questions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/forms/${formAId}`)
        .expect(200);

      expect(res.body.questions).toHaveLength(3);
      const labels = res.body.questions.map((q: any) => q.label);
      expect(labels).toContain('Full name');
      expect(labels).toContain('Is manager?');
      expect(labels).toContain('Team size range');
      expect(labels).not.toContain('Team size');
    });

    it('POST /forms + DELETE /forms/:id — soft-delete Form C', async () => {
      const create = await request(app.getHttpServer())
        .post('/forms')
        .send({
          name: 'Temp Form',
          questions: [{ type: 'text', label: 'Placeholder', order: 0 }],
        })
        .expect(201);

      formCId = create.body.id;

      await request(app.getHttpServer())
        .delete(`/forms/${formCId}`)
        .expect(200);
    });

    it('GET /forms — Form C absent from list', async () => {
      const res = await request(app.getHttpServer()).get('/forms').expect(200);

      const ids = res.body.map((f: any) => f.id);
      expect(ids).not.toContain(formCId);
    });

    it('GET /forms/:id — 404 for deleted form', async () => {
      await request(app.getHttpServer())
        .get(`/forms/${formCId}`)
        .expect(404);
    });

    it('GET /forms/:id — 404 for nonexistent UUID', async () => {
      await request(app.getHttpServer())
        .get('/forms/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  // ─── Flows ───────────────────────────────────────────────────────────

  describe('Flows', () => {
    it('POST /flows — create flow with two forms, no rules', async () => {
      const res = await request(app.getHttpServer())
        .post('/flows')
        .send({ name: 'Simple Flow', formIds: [formAId, formBId] })
        .expect(201);

      flowId = res.body.id;
      expect(flowId).toBeDefined();
    });

    it('GET /flows — lists the flow', async () => {
      const res = await request(app.getHttpServer()).get('/flows').expect(200);

      const ids = res.body.map((f: any) => f.id);
      expect(ids).toContain(flowId);
    });

    it('GET /flows/:id — detail with ordered forms, empty rules', async () => {
      const res = await request(app.getHttpServer())
        .get(`/flows/${flowId}`)
        .expect(200);

      expect(res.body.forms).toHaveLength(2);
      expect(res.body.forms[0].id).toBe(formAId);
      expect(res.body.forms[0].order).toBe(0);
      expect(res.body.forms[1].id).toBe(formBId);
      expect(res.body.forms[1].order).toBe(1);
      expect(res.body.rules).toHaveLength(0);
    });

    it('POST /flows — create flow with rule: Is manager? → enables Budget', async () => {
      const res = await request(app.getHttpServer())
        .post('/flows')
        .send({
          name: 'Flow With Rules',
          formIds: [formAId, formBId],
          rules: [
            {
              sourceQuestionId: formAQuestions['Is manager?'],
              triggerValue: 'true',
              targetQuestionId: formBQuestions['Budget'],
            },
          ],
        })
        .expect(201);

      flowWithRulesId = res.body.id;
      expect(flowWithRulesId).toBeDefined();
    });

    it('GET /flows/:id — detail shows the rule', async () => {
      const res = await request(app.getHttpServer())
        .get(`/flows/${flowWithRulesId}`)
        .expect(200);

      expect(res.body.rules).toHaveLength(1);
      expect(res.body.rules[0].sourceQuestionId).toBe(formAQuestions['Is manager?']);
      expect(res.body.rules[0].triggerValue).toBe('true');
      expect(res.body.rules[0].targetQuestionId).toBe(formBQuestions['Budget']);
    });

    it('PUT /flows/:id — update: reorder forms, drop rules', async () => {
      const res = await request(app.getHttpServer())
        .put(`/flows/${flowId}`)
        .send({ formIds: [formBId, formAId], rules: [] })
        .expect(200);

      expect(res.body.forms[0].id).toBe(formBId);
      expect(res.body.forms[1].id).toBe(formAId);
      expect(res.body.rules).toHaveLength(0);
    });

    it('DELETE /flows/:id — delete simple flow', async () => {
      await request(app.getHttpServer())
        .delete(`/flows/${flowId}`)
        .expect(200);
    });

    it('GET /flows/:id — 404 for deleted flow', async () => {
      await request(app.getHttpServer())
        .get(`/flows/${flowId}`)
        .expect(404);
    });

    it('POST /flows — 400 for nonexistent formId', async () => {
      await request(app.getHttpServer())
        .post('/flows')
        .send({
          name: 'Bad Flow',
          formIds: ['00000000-0000-0000-0000-000000000000'],
        })
        .expect(400);
    });

    it('POST /flows — 400 for backward rule (target before source)', async () => {
      await request(app.getHttpServer())
        .post('/flows')
        .send({
          name: 'Bad Rule Flow',
          formIds: [formAId, formBId],
          rules: [
            {
              sourceQuestionId: formBQuestions['Budget'],
              triggerValue: '100',
              targetQuestionId: formAQuestions['Full name'],
            },
          ],
        })
        .expect(400);
    });
  });

  // ─── FlowRuns ────────────────────────────────────────────────────────

  describe('FlowRuns', () => {
    it('POST /flow-runs — start run for alice', async () => {
      const res = await request(app.getHttpServer())
        .post('/flow-runs')
        .send({ flowId: flowWithRulesId, username: 'alice' })
        .expect(201);

      runId = res.body.id;
      expect(res.body.flowId).toBe(flowWithRulesId);
      expect(res.body.username).toBe('alice');
      expect(res.body.status).toBe('in_progress');
      expect(res.body.firstForm.id).toBe(formAId);
      expect(res.body.firstForm.questions).toHaveLength(3);
      // All Form A questions enabled (rule targets Form B)
      expect(res.body.firstForm.enabledQuestionIds).toHaveLength(3);
    });

    it('GET /flow-runs — list includes the run', async () => {
      const res = await request(app.getHttpServer()).get('/flow-runs').expect(200);

      const run = res.body.find((r: any) => r.id === runId);
      expect(run).toBeDefined();
      expect(run.status).toBe('in_progress');
      expect(run.submissionCount).toBe(0);
    });

    it('GET /flow-runs/:runId — detail with empty submissions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/flow-runs/${runId}`)
        .expect(200);

      expect(res.body.id).toBe(runId);
      expect(res.body.submissions).toHaveLength(0);
    });

    it('GET /flow-runs/:runId/state — current form is Form A', async () => {
      const res = await request(app.getHttpServer())
        .get(`/flow-runs/${runId}/state`)
        .expect(200);

      expect(res.body.formId).toBe(formAId);
      expect(res.body.enabledQuestionIds).toHaveLength(3);
    });

    it('POST /flow-runs/:runId/submissions — submit Form A (manager=true)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/flow-runs/${runId}/submissions`)
        .send({
          formId: formAId,
          answers: [
            { questionId: formAQuestions['Full name'], value: 'Alice Smith' },
            { questionId: formAQuestions['Is manager?'], value: 'true' },
            { questionId: formAQuestions['Team size range'], value: '11-50' },
          ],
        })
        .expect(201);

      expect(res.body.isComplete).toBe(false);
      expect(res.body.nextForm.id).toBe(formBId);
      // Rule fired: Budget should be enabled
      expect(res.body.nextForm.enabledQuestionIds).toContain(formBQuestions['Budget']);
      expect(res.body.nextForm.enabledQuestionIds).toContain(formBQuestions['Department']);
    });

    it('GET /flow-runs/:runId/state — now shows Form B', async () => {
      const res = await request(app.getHttpServer())
        .get(`/flow-runs/${runId}/state`)
        .expect(200);

      expect(res.body.formId).toBe(formBId);
      expect(res.body.enabledQuestionIds).toContain(formBQuestions['Budget']);
    });

    it('POST /flow-runs/:runId/submissions — submit Form B, run completes', async () => {
      const res = await request(app.getHttpServer())
        .post(`/flow-runs/${runId}/submissions`)
        .send({
          formId: formBId,
          answers: [
            { questionId: formBQuestions['Department'], value: 'Engineering' },
            { questionId: formBQuestions['Budget'], value: '50000' },
          ],
        })
        .expect(201);

      expect(res.body.isComplete).toBe(true);
      expect(res.body.nextForm).toBeUndefined();
    });

    it('GET /flow-runs/:runId — 2 submissions, status=completed', async () => {
      const res = await request(app.getHttpServer())
        .get(`/flow-runs/${runId}`)
        .expect(200);

      expect(res.body.status).toBe('completed');
      expect(res.body.completedAt).toBeDefined();
      expect(res.body.submissions).toHaveLength(2);

      const [sub1, sub2] = res.body.submissions;
      expect(sub1.formId).toBe(formAId);
      expect(sub1.answers).toHaveLength(3);
      expect(sub2.formId).toBe(formBId);
      expect(sub2.answers).toHaveLength(2);

      const nameAnswer = sub1.answers.find(
        (a: any) => a.questionId === formAQuestions['Full name'],
      );
      expect(nameAnswer.value).toBe('Alice Smith');
    });

    it('POST /flow-runs — 409 conflict: duplicate in-progress run', async () => {
      // Start bob's run
      const first = await request(app.getHttpServer())
        .post('/flow-runs')
        .send({ flowId: flowWithRulesId, username: 'bob' })
        .expect(201);

      bobRunId = first.body.id;

      // Try to start another for bob on the same flow
      await request(app.getHttpServer())
        .post('/flow-runs')
        .send({ flowId: flowWithRulesId, username: 'bob' })
        .expect(409);
    });

    it('POST /flow-runs/:runId/submissions — 400 on completed run', async () => {
      await request(app.getHttpServer())
        .post(`/flow-runs/${runId}/submissions`)
        .send({
          formId: formAId,
          answers: [{ questionId: formAQuestions['Full name'], value: 'retry' }],
        })
        .expect(400);
    });

    it('POST /flow-runs/:runId/submissions — 400 submitting wrong form', async () => {
      // Bob's run expects Form A first, try submitting Form B
      await request(app.getHttpServer())
        .post(`/flow-runs/${bobRunId}/submissions`)
        .send({
          formId: formBId,
          answers: [{ questionId: formBQuestions['Department'], value: 'HR' }],
        })
        .expect(400);
    });

    it('POST /flow-runs/:runId/submissions — 422 answer for disabled question', async () => {
      // Submit Form A for bob with manager=false
      const sub = await request(app.getHttpServer())
        .post(`/flow-runs/${bobRunId}/submissions`)
        .send({
          formId: formAId,
          answers: [
            { questionId: formAQuestions['Full name'], value: 'Bob Jones' },
            { questionId: formAQuestions['Is manager?'], value: 'false' },
            { questionId: formAQuestions['Team size range'], value: '1-10' },
          ],
        })
        .expect(201);

      // Budget should be disabled (rule didn't fire)
      expect(sub.body.nextForm.enabledQuestionIds).not.toContain(formBQuestions['Budget']);

      // Try submitting Form B with Budget answer → 422
      await request(app.getHttpServer())
        .post(`/flow-runs/${bobRunId}/submissions`)
        .send({
          formId: formBId,
          answers: [
            { questionId: formBQuestions['Department'], value: 'Sales' },
            { questionId: formBQuestions['Budget'], value: '10000' },
          ],
        })
        .expect(422);
    });

    it('GET /flow-runs/:badId — 404 for nonexistent run', async () => {
      await request(app.getHttpServer())
        .get('/flow-runs/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
