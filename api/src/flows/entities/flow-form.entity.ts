import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Flow } from './flow.entity';
import { Form } from '../../forms/entities/form.entity';

@Entity('flow_forms')
export class FlowForm {
  @PrimaryColumn({ name: 'flow_id' })
  flowId: string;

  @PrimaryColumn({ name: 'form_id' })
  formId: string;

  @Column()
  order: number;

  @ManyToOne(() => Flow, (f) => f.flowForms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'flow_id' })
  flow: Flow;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;
}
