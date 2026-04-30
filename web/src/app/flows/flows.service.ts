import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Question } from '../forms/forms.service';

export interface FlowSummary {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowForm {
  id: string;
  name: string;
  order: number;
}

export interface FlowRule {
  id: string;
  sourceQuestionId: string;
  operator: string;
  triggerValue: string;
  targetQuestionId: string;
  actionType: string;
}

export interface FlowDetail extends FlowSummary {
  forms: FlowForm[];
  rules: FlowRule[];
}

export interface RuleDraft {
  sourceQuestionId: string;
  triggerValue: string;
  targetQuestionId: string;
  _idx: number;
}

export interface FlowPayload {
  name: string;
  description?: string;
  formIds: string[];
  rules?: { sourceQuestionId: string; triggerValue: string; targetQuestionId: string }[];
}

export interface FormState {
  enabledQuestionIds: string[];
}

export interface SubmitResult {
  submissionId: string;
  isComplete: boolean;
  nextForm?: {
    id: string;
    name: string;
    order: number;
    questions: Question[];
    enabledQuestionIds: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class FlowsService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<FlowSummary[]>('/api/flows');
  }

  get(id: string) {
    return this.http.get<FlowDetail>(`/api/flows/${id}`);
  }

  create(body: FlowPayload) {
    return this.http.post<FlowDetail>('/api/flows', body);
  }

  update(id: string, body: FlowPayload) {
    return this.http.put<FlowDetail>(`/api/flows/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`/api/flows/${id}`);
  }

  getFormState(flowId: string, formId: string, username: string) {
    return this.http.get<FormState>(
      `/api/flows/${flowId}/forms/${formId}/state`,
      { params: { username } },
    );
  }

  submitForm(
    flowId: string,
    body: { formId: string; username: string; answers: { questionId: string; value: string }[] },
  ) {
    return this.http.post<SubmitResult>(`/api/flows/${flowId}/submissions`, body);
  }
}
