import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Form } from '../../builder/entities/form.entity';
import { FlowRun } from './flow-run.entity';
import { Answer } from './answer.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column({ name: 'flow_run_id' })
  flowRunId: string;

  @CreateDateColumn()
  submittedAt: Date;

  @ManyToOne(() => Form)
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @ManyToOne(() => FlowRun)
  @JoinColumn({ name: 'flow_run_id' })
  flowRun: FlowRun;

  @OneToMany(() => Answer, (a) => a.submission, { cascade: true })
  answers: Answer[];
}
