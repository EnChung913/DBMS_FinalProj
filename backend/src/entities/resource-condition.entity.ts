import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Resource } from './resource.entity';

@Entity('resource_condition')
export class ResourceCondition {
  @PrimaryColumn('uuid')
  resource_id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  department_id: string;

  @Column({ type: 'float', nullable: true })
  avg_gpa: number | null;

  @Column({ type: 'float', nullable: true })
  current_gpa: number | null;

  @Column({ type: 'boolean', nullable: true })
  is_poor: boolean | null;

  @ManyToOne(() => Resource, (resource) => resource.conditions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'resource_id' })
  resource: Resource;
}
