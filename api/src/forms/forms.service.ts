import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Form } from './entities/form.entity';
import { CreateFormDto, UpdateFormDto } from './dto';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(Form) private formsRepo: Repository<Form>,
  ) {}

  findAll(): Promise<Form[]> {
    return this.formsRepo.find({
      relations: {
        questions: true,
      }
    });
  }

  async findOne(id: string): Promise<Form> {
    const form = await this.formsRepo.findOne({
      where: { id },
      relations: ['questions'],
    });
    if (!form) throw new NotFoundException();
    return form;
  }

  create(data: CreateFormDto): Promise<Form> {
    const form = this.formsRepo.create(data);
    return this.formsRepo.save(form);
  }

  async update(id: string, data: UpdateFormDto): Promise<Form> {
    const form = await this.findOne(id);
    Object.assign(form, data);
    return this.formsRepo.save(form);
  }

  async remove(id: string): Promise<void> {
    const form = await this.findOne(id);
    await this.formsRepo.remove(form);
  }
}
