import { QuestionType } from '../entities/question.entity';

export class QuestionResponseDto {
  id: string;
  type: QuestionType;
  label: string;
  order: number;
  config: Record<string, any>;
  createdAt: Date;
  deletedAt?: Date;
}

export class FormResponseDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  questions: QuestionResponseDto[];
}
