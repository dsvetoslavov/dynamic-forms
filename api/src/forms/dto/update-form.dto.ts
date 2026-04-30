import { QuestionType } from '../entities/question.entity';

export class UpdateQuestionDto {
  id?: string;
  type: QuestionType;
  label: string;
  order: number;
  required?: boolean;
  config?: Record<string, any>;
}

export class UpdateFormDto {
  name: string;
  description?: string;
  questions: UpdateQuestionDto[];
}
