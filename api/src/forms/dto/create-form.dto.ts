import { QuestionType } from '../entities/question.entity';

export class CreateQuestionDto {
  type: QuestionType;
  label: string;
  order: number;
  required?: boolean;
  config?: Record<string, any>;
}

export class CreateFormDto {
  name: string;
  description?: string;
  questions: CreateQuestionDto[];
}
