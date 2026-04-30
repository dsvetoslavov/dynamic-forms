export class CreateAnswerDto {
  questionId: string;
  value: string;
}

export class CreateSubmissionDto {
  formId: string;
  username: string;
  answers: CreateAnswerDto[];
}
