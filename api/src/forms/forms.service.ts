import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Form } from './entities/form.entity';
import { Question } from './entities/question.entity';
import { FORMS_REPOSITORY } from './forms.repository';
import { type FormsRepository } from './forms.repository';

@Injectable()
export class FormsService {
  constructor(
    @Inject(FORMS_REPOSITORY) private formsRepo: FormsRepository,
  ) {}

  findAll(): Promise<Form[]> {
    return this.formsRepo.findAll();
  }

  async findOne(id: string): Promise<Form> {
    const form = await this.formsRepo.findOne(id);
    if (!form) throw new NotFoundException();
    return form;
  }

  async create(data: { name: string; description?: string; questions: Partial<Question>[] }): Promise<Form> {
    return this.formsRepo.create(data);
  }

  async update(
    id: string,
    data: { name: string; description?: string; questions: (Partial<Question> & { id?: string })[] },
  ): Promise<Form> {
    const form = await this.findOne(id);

    form.name = data.name;
    form.description = data.description ?? form.description;

    const existingQuestions = form.questions ?? [];

    // Determine which existing questions to soft-delete
    const toSoftDelete: Question[] = [];
    for (const existing of existingQuestions) {
      const incoming = data.questions.find((q) => q.id === existing.id);
      if (!incoming || this.questionChanged(existing, incoming)) {
        toSoftDelete.push(existing);
      }
    }

    // Build new questions array: keep unchanged, create fresh for new/changed
    const questions: Partial<Question>[] = [];
    for (const q of data.questions) {
      const existing = q.id ? existingQuestions.find((e) => e.id === q.id) : undefined;
      if (existing && !this.questionChanged(existing, q)) {
        questions.push(existing);
      } else {
        questions.push({
          type: q.type,
          label: q.label,
          order: q.order,
          config: q.config ?? {},
          formId: id,
        });
      }
    }

    form.questions = questions as Question[];
    return this.formsRepo.update(form, toSoftDelete);
  }

  async remove(id: string): Promise<void> {
    const form = await this.findOne(id);
    await this.formsRepo.softRemove(form);
  }

  private questionChanged(existing: Question, incoming: Partial<Question>): boolean {
    return (
      existing.type !== incoming.type ||
      existing.label !== incoming.label ||
      existing.order !== incoming.order ||
      JSON.stringify(existing.config) !== JSON.stringify(incoming.config ?? {})
    );
  }
}