import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class FlowRunAnswerDto {
  @IsUUID()
  questionId: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class SubmitFlowRunDto {
  @IsUUID()
  formId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FlowRunAnswerDto)
  answers: FlowRunAnswerDto[];
}
