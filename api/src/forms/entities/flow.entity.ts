import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { FlowForm } from './flow-form.entity';
import { Rule } from './rule.entity';

@Entity('flows')
export class Flow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @OneToMany(() => FlowForm, (ff) => ff.flow, { cascade: true, orphanedRowAction: 'delete' })
  flowForms: FlowForm[];

  @OneToMany(() => Rule, (r) => r.flow, { cascade: true })
  rules: Rule[];
}
