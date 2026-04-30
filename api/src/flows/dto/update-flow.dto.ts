import { CreateRuleDto } from './create-flow.dto';

export class UpdateFlowDto {
  name?: string;
  description?: string;
  formIds: string[];
  rules?: CreateRuleDto[];
}
