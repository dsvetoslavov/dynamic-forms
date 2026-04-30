import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { Question } from './entities/question.entity';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { FORMS_REPOSITORY, TypeOrmFormsRepository } from './forms.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Form, Question])],
  controllers: [FormsController],
  providers: [
    FormsService,
    { provide: FORMS_REPOSITORY, useClass: TypeOrmFormsRepository },
  ],
  exports: [FormsService],
})
export class FormsModule {}
