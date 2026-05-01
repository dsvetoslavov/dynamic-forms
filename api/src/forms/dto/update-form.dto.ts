import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsObject,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from '../entities/question.entity';

export class UpdateQuestionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString()
  @IsNotEmpty()
  label: string;

  @IsInt()
  order: number;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class UpdateFormDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateQuestionDto)
  questions: UpdateQuestionDto[];
}
