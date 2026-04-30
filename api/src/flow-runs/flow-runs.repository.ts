import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { FlowRun } from './entities/flow-run.entity';
import { Submission } from './entities/submission.entity';

export const FLOW_RUNS_REPOSITORY = Symbol('FLOW_RUNS_REPOSITORY');

export interface FlowRunsRepository {
  findOne(id: string): Promise<FlowRun | null>;
  findByFlowAndUsername(flowId: string, username: string): Promise<FlowRun | null>;
  create(data: { flowId: string; username: string }): Promise<FlowRun>;
  complete(flowRun: FlowRun): Promise<FlowRun>;
  createSubmission(data: DeepPartial<Submission>): Promise<Submission>;
}

@Injectable()
export class TypeOrmFlowRunsRepository implements FlowRunsRepository {
  constructor(
    @InjectRepository(FlowRun)
    private flowRunsRepo: Repository<FlowRun>,
    @InjectRepository(Submission)
    private submissionsRepo: Repository<Submission>,
  ) {}

  findOne(id: string): Promise<FlowRun | null> {
    return this.flowRunsRepo.findOne({
      where: { id },
      relations: ['submissions', 'submissions.answers'],
    });
  }

  findByFlowAndUsername(flowId: string, username: string): Promise<FlowRun | null> {
    return this.flowRunsRepo.findOne({
      where: { flowId, username, status: 'in_progress' },
      relations: ['submissions', 'submissions.answers'],
    });
  }

  async create(data: { flowId: string; username: string }): Promise<FlowRun> {
    const flowRun = this.flowRunsRepo.create(data);
    return this.flowRunsRepo.save(flowRun);
  }

  async complete(flowRun: FlowRun): Promise<FlowRun> {
    flowRun.status = 'completed';
    flowRun.completedAt = new Date();
    return this.flowRunsRepo.save(flowRun);
  }

  async createSubmission(data: DeepPartial<Submission>): Promise<Submission> {
    const submission = this.submissionsRepo.create(data);
    return this.submissionsRepo.save(submission);
  }
}
