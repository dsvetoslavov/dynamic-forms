import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flow } from './entities/flow.entity';
import { FlowForm } from './entities/flow-form.entity';
import { Rule } from './entities/rule.entity';
import { Question } from '../forms/entities/question.entity';
import { Submission } from '../submissions/entities/submission.entity';
import { Answer } from '../submissions/entities/answer.entity';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { FlowSubmissionsController } from './flow-submissions.controller';
import { FlowSubmissionsService } from './flow-submissions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flow, FlowForm, Rule, Question, Submission, Answer]),
  ],
  controllers: [FlowsController, FlowSubmissionsController],
  providers: [FlowsService, FlowSubmissionsService],
  exports: [FlowsService],
})
export class FlowsModule {}
