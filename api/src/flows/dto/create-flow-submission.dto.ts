export class FlowSubmissionAnswerDto {
  questionId: string;
  value: string;
}

export class CreateFlowSubmissionDto {
  formId: string;
  username: string;
  answers: FlowSubmissionAnswerDto[];
}
