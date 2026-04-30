import { QuestionResponseDto } from '../../forms/dto';

export class AnswerResponseDto {
  id: string;
  questionId: string;
  value: string;
  question?: QuestionResponseDto;
}

export class SubmissionResponseDto {
  id: string;
  formId: string;
  username: string;
  flowId: string | null;
  submittedAt: Date;
  answers: AnswerResponseDto[];
}
