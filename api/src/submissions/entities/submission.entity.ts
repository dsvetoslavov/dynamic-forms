import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Form } from '../../forms/entities/form.entity';
import { Flow } from '../../flows/entities/flow.entity';
import { Answer } from './answer.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column()
  username: string;

  @Column({ name: 'flow_id', nullable: true })
  flowId: string | null;

  @CreateDateColumn()
  submittedAt: Date;

  @ManyToOne(() => Form)
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @ManyToOne(() => Flow, { nullable: true })
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;

  @OneToMany(() => Answer, (a) => a.submission, { cascade: true })
  answers: Answer[];
}
