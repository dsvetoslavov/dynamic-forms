import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { Question } from './entities/question.entity';
import { Flow } from './entities/flow.entity';
import { FlowForm } from './entities/flow-form.entity';
import { Rule } from './entities/rule.entity';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FORMS_REPOSITORY, TypeOrmFormsRepository } from './forms.repository';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { FLOWS_REPOSITORY, TypeOrmFlowsRepository } from './flows.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Form, Question, Flow, FlowForm, Rule])],
  controllers: [FormsController, FlowsController],
  providers: [
    FormsService,
    { provide: FORMS_REPOSITORY, useClass: TypeOrmFormsRepository },
    FlowsService,
    { provide: FLOWS_REPOSITORY, useClass: TypeOrmFlowsRepository },
  ],
  exports: [FormsService, FORMS_REPOSITORY, FlowsService, FLOWS_REPOSITORY],
})
export class BuilderModule {}
