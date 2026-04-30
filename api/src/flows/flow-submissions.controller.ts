import { Controller, Post, Get, Param, Query, Body } from '@nestjs/common';
import { FlowSubmissionsService } from './flow-submissions.service';

@Controller('flows/:flowId')
export class FlowSubmissionsController {
  constructor(private readonly svc: FlowSubmissionsService) {}

  @Get('forms/:formId/state')
  getFormState(
    @Param('flowId') flowId: string,
    @Param('formId') formId: string,
    @Query('username') username: string,
  ) {
    return this.svc.getFormState(flowId, formId, username);
  }

  @Post('submissions')
  submit(
    @Param('flowId') flowId: string,
    @Body() body: any,
  ) {
    return this.svc.submit(flowId, body);
  }
}
