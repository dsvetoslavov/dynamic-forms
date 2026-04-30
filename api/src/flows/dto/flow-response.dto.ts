export class FlowFormResponseDto {
  id: string;
  name: string;
  order: number;
}

export class RuleResponseDto {
  id: string;
  flowId: string;
  sourceQuestionId: string;
  operator: string;
  triggerValue: string;
  targetQuestionId: string;
  actionType: string;
  createdAt: Date;
  updatedAt: Date;
}

export class FlowResponseDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class FlowDetailResponseDto {
  id: string;
  name: string;
  description: string | null;
  forms: FlowFormResponseDto[];
  rules: RuleResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
