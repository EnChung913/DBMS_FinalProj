import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ResourceCondition } from './resource-condition.entity';

@Entity('resource')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  resource_id: string;

  @Column({ type: 'varchar', length: 20 })
  resource_type: string;

  @Column({ type: 'int' })
  quota: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  department_supplier_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  company_supplier_id: string | null;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'date', nullable: true })
  deadline: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', length: 20, default: 'Unavailable' })
  status: string;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @OneToMany(() => ResourceCondition, (rc) => rc.resource)
  conditions: ResourceCondition[];
}
