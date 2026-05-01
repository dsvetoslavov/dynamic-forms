import { QuestionResponseDto } from '../../builder/dto';

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
  username: string;
  formId: string | null;
  formName: string | null;
  formOrder: number;
  questions: QuestionResponseDto[];
  enabledQuestionIds: string[];
}

export class FlowRunSubmissionResponseDto {
  submissionId: string;
  isComplete: boolean;
  nextForm?: FlowRunFormDto;
}

export class FlowRunSummaryDto {
  id: string;
  flowId: string;
  flowName: string;
  username: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  submissionCount: number;
}

export class FlowRunAnswerResponseDto {
  id: string;
  questionId: string;
  value: string;
  questionLabel: string;
}

export class FlowRunSubmissionDetailDto {
  id: string;
  formId: string;
  formName: string;
  submittedAt: Date;
  answers: FlowRunAnswerResponseDto[];
}

export class FlowRunDetailDto {
  id: string;
  flowId: string;
  flowName: string;
  username: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  submissions: FlowRunSubmissionDetailDto[];
}
