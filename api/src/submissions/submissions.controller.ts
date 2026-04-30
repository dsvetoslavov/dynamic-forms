import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, SubmissionResponseDto } from './dto';
import { Submission } from './entities/submission.entity';

function toSubmissionResponse(submission: Submission): SubmissionResponseDto {
  return {
    id: submission.id,
    formId: submission.formId,
    username: submission.username,
    flowId: submission.flowId,
    submittedAt: submission.submittedAt,
    answers: submission.answers?.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      value: a.value,
      ...(a.question ? {
        question: {
          id: a.question.id,
          type: a.question.type,
          label: a.question.label,
          order: a.question.order,
          required: a.question.required,
          config: a.question.config,
          createdAt: a.question.createdAt,
        },
      } : {}),
    })) ?? [],
  };
}

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly service: SubmissionsService) {}

  @Get()
  async findAll(): Promise<SubmissionResponseDto[]> {
    const submissions = await this.service.findAll();
    return submissions.map(toSubmissionResponse);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<SubmissionResponseDto> {
    const submission = await this.service.findOne(id);
    return toSubmissionResponse(submission);
  }

  @Post()
  async create(@Body() body: CreateSubmissionDto): Promise<SubmissionResponseDto> {
    const submission = await this.service.create(body);
    return toSubmissionResponse(submission);
  }
}
