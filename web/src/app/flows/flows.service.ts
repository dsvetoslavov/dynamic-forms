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
  triggerValue: string;
  targetQuestionId: string;
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

export interface FlowRunResponse {
  id: string;
  flowId: string;
  username: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  firstForm: {
    id: string;
    name: string;
    order: number;
    questions: Question[];
    enabledQuestionIds: string[];
  };
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

export interface FlowRunSummary {
  id: string;
  flowId: string;
  flowName: string;
  username: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  submissionCount: number;
}

export interface FlowRunDetail {
  id: string;
  flowId: string;
  flowName: string;
  username: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  submissions: FlowRunSubmission[];
}

export interface FlowRunSubmission {
  id: string;
  formId: string;
  formName: string;
  submittedAt: string;
  answers: FlowRunAnswer[];
}

export interface FlowRunAnswer {
  id: string;
  questionId: string;
  value: string;
  questionLabel: string;
  deletedAt?: string;
}

export interface FlowRunState {
  username: string;
  formId: string | null;
  formName: string | null;
  formOrder: number;
  questions: Question[];
  enabledQuestionIds: string[];
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

  createFlowRun(flowId: string, username: string) {
    return this.http.post<FlowRunResponse>('/api/flow-runs', { flowId, username });
  }

  submitFlowRunForm(runId: string, formId: string, answers: { questionId: string; value: string }[]) {
    return this.http.post<SubmitResult>(`/api/flow-runs/${runId}/submissions`, { formId, answers });
  }

  listFlowRuns() {
    return this.http.get<FlowRunSummary[]>('/api/flow-runs');
  }

  getFlowRun(runId: string) {
    return this.http.get<FlowRunDetail>(`/api/flow-runs/${runId}`);
  }

  getFlowRunState(runId: string) {
    return this.http.get<FlowRunState>(`/api/flow-runs/${runId}/state`);
  }
}
