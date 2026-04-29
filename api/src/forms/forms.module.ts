import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Form } from './entities/form.entity';
import { Question } from './entities/question.entity';
import { Rule } from './entities/rule.entity';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';

@Module({
  imports: [TypeOrmModule.forFeature([Form, Question, Rule])],
  controllers: [FormsController],
  providers: [FormsService],
  exports: [FormsService],
})
export class FormsModule {}
