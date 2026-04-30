import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class FlowSubmissionAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateFlowSubmissionDto {
  @IsUUID()
  formId: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowSubmissionAnswerDto)
  answers: FlowSubmissionAnswerDto[];
}
