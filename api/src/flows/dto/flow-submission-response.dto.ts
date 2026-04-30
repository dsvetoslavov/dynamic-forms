import { QuestionResponseDto } from '../../forms/dto';

export class FormStateResponseDto {
  enabledQuestionIds: string[];
}

export class NextFormResponseDto {
  id: string;
  name: string;
  order: number;
  questions: QuestionResponseDto[];
  enabledQuestionIds: string[];
}

export class FlowSubmissionResponseDto {
  submissionId: string;
  isComplete: boolean;
  nextForm?: NextFormResponseDto;
}
