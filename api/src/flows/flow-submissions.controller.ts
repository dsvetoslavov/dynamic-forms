import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { FlowSubmissionsService } from './flow-submissions.service';
import { CreateFlowSubmissionDto, FormStateResponseDto, FlowSubmissionResponseDto } from './dto';

@Controller('flows/:flowId')
export class FlowSubmissionsController {
  constructor(private readonly svc: FlowSubmissionsService) {}

  @Get('forms/:formId/state')
  async getFormState(
    @Param('flowId') flowId: string,
    @Param('formId') formId: string,
    @Query('username') username: string,
  ): Promise<FormStateResponseDto> {
    const enabledQuestionIds = await this.svc.getFormState(flowId, formId, username);
    return { enabledQuestionIds };
  }

  @Post('submissions')
  async submit(
    @Param('flowId') flowId: string,
    @Body() body: CreateFlowSubmissionDto,
  ): Promise<FlowSubmissionResponseDto> {
    const result = await this.svc.submit(flowId, body);

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
