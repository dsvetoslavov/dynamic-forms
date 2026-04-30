import { QuestionType } from '../entities/question.entity';

export class QuestionResponseDto {
  id: string;
  type: QuestionType;
  label: string;
  order: number;
  required: boolean;
  config: Record<string, any>;
  createdAt: Date;
}

export class FormResponseDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: QuestionResponseDto[];
}
