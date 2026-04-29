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
import { Answer } from './answer.entity';

@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'form_id' })
  formId: string;

  @Column()
  username: string;

  @CreateDateColumn()
  submittedAt: Date;

  @ManyToOne(() => Form)
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @OneToMany(() => Answer, (a) => a.submission, { cascade: true })
  answers: Answer[];
}
