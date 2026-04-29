import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Form } from './form.entity';

export enum QuestionType {
  TEXT = 'text',
  YES_NO = 'yes_no',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  NUMBER = 'number',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column()
  label: string;

  @Column()
  order: number;

  @Column({ default: false })
  required: boolean;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Form, (f) => f.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @Column({ name: 'form_id' })
  formId: string;
}
