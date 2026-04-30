import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { FlowRunsService } from './flow-runs.service';
import {
  CreateFlowRunDto,
  SubmitFlowRunDto,
  FlowRunResponseDto,
  FlowRunStateResponseDto,
  FlowRunSubmissionResponseDto,
} from './dto';

@Controller('flow-runs')
export class FlowRunsController {
  constructor(private readonly svc: FlowRunsService) {}

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
    return this.svc.getState(runId);
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
