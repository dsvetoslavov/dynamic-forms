import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from './entities/submission.entity';

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission) private repo: Repository<Submission>,
  ) {}

  findAll(): Promise<Submission[]> {
    return this.repo.find({ relations: ['answers'] });
  }

  async findOne(id: string): Promise<Submission> {
    const sub = await this.repo.findOne({
      where: { id },
      relations: ['answers', 'answers.question'],
    });
    if (!sub) throw new NotFoundException();
    return sub;
  }

  create(data: Partial<Submission>): Promise<Submission> {
    const sub = this.repo.create(data);
    return this.repo.save(sub);
  }
}
