import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';

export class CreateRuleDto {
  @IsUUID()
  sourceQuestionId: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsString()
  @IsNotEmpty()
  triggerValue: string;

  @IsUUID()
  targetQuestionId: string;

  @IsOptional()
  @IsString()
  actionType?: string;
}

export class CreateFlowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  formIds: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRuleDto)
  rules?: CreateRuleDto[];
}
