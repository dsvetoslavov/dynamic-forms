import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, Repository } from 'typeorm';
import { Form } from './entities/form.entity';
import { Question } from './entities/question.entity';

export const FORMS_REPOSITORY = Symbol('FORMS_REPOSITORY');

export interface FormsRepository {
  findAll(): Promise<Form[]>;
  findOne(id: string): Promise<Form | null>;
  create(data: DeepPartial<Form>): Promise<Form>;
  update(form: Form, questionsToRemove: Question[]): Promise<Form>;
  softRemove(form: Form): Promise<void>;
}

@Injectable()
export class TypeOrmFormsRepository implements FormsRepository {
  constructor(
    @InjectRepository(Form) private formsRepo: Repository<Form>,
    private dataSource: DataSource,
  ) {}

  findAll(): Promise<Form[]> {
    return this.formsRepo.find({ relations: { questions: true } });
  }

  findOne(id: string): Promise<Form | null> {
    return this.formsRepo.findOne({ where: { id }, relations: ['questions'] });
  }

  async create(data: DeepPartial<Form>): Promise<Form> {
    const form = this.formsRepo.create(data);
    return this.formsRepo.save(form);
  }

  async update(form: Form, questionsToRemove: Question[]): Promise<Form> {
    return this.dataSource.transaction(async (manager) => {
      if (questionsToRemove.length) {
        await manager.softRemove(questionsToRemove);
      }
      return manager.save(form);
    });
  }

  async softRemove(form: Form): Promise<void> {
    await this.formsRepo.softRemove(form);
  }
}
