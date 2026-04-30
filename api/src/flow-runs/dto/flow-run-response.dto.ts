import { QuestionResponseDto } from '../../forms/dto';

export class FlowRunResponseDto {
  id: string;
  flowId: string;
  username: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  firstForm?: FlowRunFormDto;
}

export class FlowRunFormDto {
  id: string;
  name: string;
  order: number;
  questions: QuestionResponseDto[];
  enabledQuestionIds: string[];
}

export class FlowRunStateResponseDto {
  formId: string | null;
  enabledQuestionIds: string[];
}

export class FlowRunSubmissionResponseDto {
  submissionId: string;
  isComplete: boolean;
  nextForm?: FlowRunFormDto;
}
