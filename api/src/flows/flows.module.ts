import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flow } from './entities/flow.entity';
import { FlowForm } from './entities/flow-form.entity';
import { Rule } from './entities/rule.entity';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { FLOWS_REPOSITORY, TypeOrmFlowsRepository } from './flows.repository';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flow, FlowForm, Rule]),
    FormsModule,
  ],
  controllers: [FlowsController],
  providers: [
    FlowsService,
    { provide: FLOWS_REPOSITORY, useClass: TypeOrmFlowsRepository },
  ],
  exports: [FlowsService, FLOWS_REPOSITORY],
})
export class FlowsModule {}
