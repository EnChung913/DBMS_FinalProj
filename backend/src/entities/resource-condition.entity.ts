import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Resource } from './resource.entity';

@Entity('resource_condition')
export class ResourceCondition {
  @PrimaryGeneratedColumn('uuid')
  condition_id: string; // 單一主鍵

  @Column('uuid')
  resource_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  department_id: string | null; // NULL = 全系通用條件

  @Column({ type: 'float', nullable: true })
  avg_gpa: number | null;

  @Column({ type: 'float', nullable: true })
  current_gpa: number | null;

  @Column({ type: 'boolean', nullable: true })
  is_poor: boolean | null;

  @ManyToOne(() => Resource, (resource) => resource.conditions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;
}
