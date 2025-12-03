import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne } from 'typeorm';
import { ResourceCondition } from './resource-condition.entity';
import { User } from './user.entity';
import { JoinColumn } from 'typeorm/decorator/relations/JoinColumn';

@Entity('resource')
export class Resource {
  @PrimaryGeneratedColumn('uuid')
  resource_id: string;

  @Column({ type: 'varchar', length: 20 })
  resource_type: string;

  @Column({ type: 'int' })
  quota: number;

  @Column({ type: 'uuid', nullable: true })
  department_supplier_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  company_supplier_id: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'department_supplier_id' })
  departmentSupplier: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'company_supplier_id' })
  companySupplier: User;

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
