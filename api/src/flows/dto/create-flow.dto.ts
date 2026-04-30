export class CreateRuleDto {
  sourceQuestionId: string;
  operator?: string;
  triggerValue: string;
  targetQuestionId: string;
  actionType?: string;
}

export class CreateFlowDto {
  name: string;
  description?: string;
  formIds: string[];
  rules?: CreateRuleDto[];
}
