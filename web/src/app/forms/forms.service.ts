import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Question {
  id?: string;
  type: string;
  label: string;
  order: number;
  required: boolean;
  config: Record<string, any>;
}

export interface Form {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  questions: Question[];
}

export interface Rule {
  id: string;
  formId: string;
  sourceQuestionId: string;
  operator: string;
  triggerValue: string;
  targetQuestionId: string;
  action: string;
}

@Injectable({ providedIn: 'root' })
export class FormsService {
  private http = inject(HttpClient);

  list() {
    return this.http.get<Form[]>('/api/forms');
  }

  get(id: string) {
    return this.http.get<Form>(`/api/forms/${id}`);
  }

  create(body: Partial<Form>) {
    return this.http.post<Form>('/api/forms', body);
  }

  update(id: string, body: Partial<Form>) {
    return this.http.put<Form>(`/api/forms/${id}`, body);
  }

  delete(id: string) {
    return this.http.delete(`/api/forms/${id}`);
  }
}
