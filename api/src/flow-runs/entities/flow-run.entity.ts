import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Flow } from '../../flows/entities/flow.entity';
import { Submission } from './submission.entity';

@Entity('flow_runs')
export class FlowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'flow_id' })
  flowId: string;

  @Column()
  username: string;

  @Column({ default: 'in_progress' })
  status: string;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @ManyToOne(() => Flow)
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;

  @OneToMany(() => Submission, (s) => s.flowRun)
  submissions: Submission[];
}
