import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Form } from './form.entity';
import { Question } from './question.entity';

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ name: 'source_question_id' })
  sourceQuestionId: string;

  @Column({ default: '=' })
  operator: string;

  @Column({ name: 'trigger_value' })
  triggerValue: string;

  @Column({ name: 'target_question_id' })
  targetQuestionId: string;

  @Column({ default: 'enable' })
  action: string;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_question_id' })
  sourceQuestion: Question;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_question_id' })
  targetQuestion: Question;
}
