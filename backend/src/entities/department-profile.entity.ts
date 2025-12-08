import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('department_profile')
export class DepartmentProfile {
  @PrimaryColumn()
  department_id: string;

  @Column({ length: 50 })
  contact_person: string;

  @Column({ length: 100 })
  department_name: string;
}
