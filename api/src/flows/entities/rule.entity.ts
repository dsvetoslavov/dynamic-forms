import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Flow } from './flow.entity';
import { Question } from '../../forms/entities/question.entity';

@Entity('rules')
export class Rule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'flow_id' })
  flowId: string;

  @Column({ name: 'source_question_id' })
  sourceQuestionId: string;

  @Column({ default: '=' })
  operator: string;

  @Column({ name: 'trigger_value' })
  triggerValue: string;

  @Column({ name: 'target_question_id' })
  targetQuestionId: string;

  @Column({ name: 'action_type', default: 'enable_target' })
  actionType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @ManyToOne(() => Flow, (f) => f.rules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_question_id' })
  sourceQuestion: Question;

  @ManyToOne(() => Question, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_question_id' })
  targetQuestion: Question;
}
