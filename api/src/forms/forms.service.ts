import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from './entities/form.entity';
import { Question } from './entities/question.entity';
import { Rule } from './entities/rule.entity';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form) private formsRepo: Repository<Form>,
    @InjectRepository(Question) private questionsRepo: Repository<Question>,
    @InjectRepository(Rule) private rulesRepo: Repository<Rule>,
  ) {}

  findAll(): Promise<Form[]> {
    return this.formsRepo.find();
  }

  async findOne(id: string): Promise<Form> {
    const form = await this.formsRepo.findOne({
      where: { id },
      relations: ['questions'],
    });
    if (!form) throw new NotFoundException();
    return form;
  }

  create(data: Partial<Form>): Promise<Form> {
    const form = this.formsRepo.create(data);
    return this.formsRepo.save(form);
  }

  async update(id: string, data: Partial<Form>): Promise<Form> {
    const form = await this.findOne(id);
    Object.assign(form, data);
    return this.formsRepo.save(form);
  }

  async remove(id: string): Promise<void> {
    const form = await this.findOne(id);
    await this.formsRepo.remove(form);
  }

  // Rules
  findRulesByForm(formId: string): Promise<Rule[]> {
    return this.rulesRepo.find({ where: { formId } });
  }

  createRule(data: Partial<Rule>): Promise<Rule> {
    const rule = this.rulesRepo.create(data);
    return this.rulesRepo.save(rule);
  }

  async removeRule(id: string): Promise<void> {
    const result = await this.rulesRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException();
  }
}
