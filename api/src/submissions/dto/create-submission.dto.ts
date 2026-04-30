import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class CreateAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateSubmissionDto {
  @IsUUID()
  formId: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  answers: CreateAnswerDto[];
}
