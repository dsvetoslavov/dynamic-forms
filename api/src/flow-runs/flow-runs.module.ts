import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlowRun } from './entities/flow-run.entity';
import { Submission } from './entities/submission.entity';
import { Answer } from './entities/answer.entity';
import { FlowRunsController } from './flow-runs.controller';
import { FlowRunsService } from './flow-runs.service';
import {
  FLOW_RUNS_REPOSITORY,
  TypeOrmFlowRunsRepository,
} from './flow-runs.repository';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlowRun, Submission, Answer]),
    FormsModule,
  ],
  controllers: [FlowRunsController],
  providers: [
    FlowRunsService,
    { provide: FLOW_RUNS_REPOSITORY, useClass: TypeOrmFlowRunsRepository },
  ],
})
export class FlowRunsModule {}
