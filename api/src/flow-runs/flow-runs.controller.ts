import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { FlowRunsService } from './flow-runs.service';
import {
  CreateFlowRunDto,
  SubmitFlowRunDto,
  FlowRunResponseDto,
  FlowRunStateResponseDto,
  FlowRunSubmissionResponseDto,
  FlowRunSummaryDto,
  FlowRunDetailDto,
} from './dto';

@Controller('flow-runs')
export class FlowRunsController {
  constructor(private readonly svc: FlowRunsService) {}

  @Get()
  async findAll(): Promise<FlowRunSummaryDto[]> {
    const runs = await this.svc.findAll();
    return runs.map((r) => ({
      id: r.id,
      flowId: r.flowId,
      flowName: r.flow?.name ?? r.flowId,
      username: r.username,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      submissionCount: r.submissions?.length ?? 0,
    }));
  }

  @Post()
  async create(@Body() body: CreateFlowRunDto): Promise<FlowRunResponseDto> {
    const result = await this.svc.create(body.flowId, body.username);

    return {
      id: result.flowRun.id,
      flowId: result.flowRun.flowId,
      username: result.flowRun.username,
      status: result.flowRun.status,
      startedAt: result.flowRun.startedAt,
      completedAt: result.flowRun.completedAt,
      firstForm: {
        id: result.firstForm.id,
        name: result.firstForm.name,
        order: result.firstForm.order,
        questions: result.firstForm.questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          order: q.order,
          required: q.required,
          config: q.config,
          createdAt: q.createdAt,
        })),
        enabledQuestionIds: result.firstForm.enabledQuestionIds,
      },
    };
  }

  @Get(':runId/state')
  async getState(@Param('runId') runId: string): Promise<FlowRunStateResponseDto> {
    const state = await this.svc.getState(runId);
    return {
      username: state.username,
      formId: state.formId,
      formName: state.formName,
      formOrder: state.formOrder,
      questions: state.questions.map((q) => ({
        id: q.id,
        type: q.type,
        label: q.label,
        order: q.order,
        required: q.required,
        config: q.config,
        createdAt: q.createdAt,
      })),
      enabledQuestionIds: state.enabledQuestionIds,
    };
  }

  @Get(':runId')
  async findOne(@Param('runId') runId: string): Promise<FlowRunDetailDto> {
    const r = await this.svc.findOne(runId);
    return {
      id: r.id,
      flowId: r.flowId,
      flowName: r.flow?.name ?? r.flowId,
      username: r.username,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      submissions: (r.submissions || [])
        .sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime())
        .map((s) => ({
          id: s.id,
          formId: s.formId,
          formName: s.form?.name ?? s.formId,
          submittedAt: s.submittedAt,
          answers: (s.answers || []).map((a) => ({
            id: a.id,
            questionId: a.questionId,
            value: a.value,
            questionLabel: a.question?.label ?? a.questionId,
          })),
        })),
    };
  }

  @Post(':runId/submissions')
  async submit(
    @Param('runId') runId: string,
    @Body() body: SubmitFlowRunDto,
  ): Promise<FlowRunSubmissionResponseDto> {
    const result = await this.svc.submit(runId, body);

    if (result.isComplete) {
      return { submissionId: result.submissionId, isComplete: true };
    }

    return {
      submissionId: result.submissionId,
      isComplete: false,
      nextForm: {
        id: result.nextForm.id,
        name: result.nextForm.name,
        order: result.nextForm.order,
        questions: result.nextForm.questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label,
          order: q.order,
          required: q.required,
          config: q.config,
          createdAt: q.createdAt,
        })),
        enabledQuestionIds: result.nextForm.enabledQuestionIds,
      },
    };
  }
}
