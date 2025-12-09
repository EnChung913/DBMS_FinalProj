import { Entity, Column, PrimaryColumn } from 'typeorm';

export enum DepartmentRole {
  MAJOR = 'major',
  MINOR = 'minor',
  DOUBLE_MAJOR = 'double_major',
}

@Entity('student_department')
export class StudentDepartment {
  @PrimaryColumn({ type: 'uuid' })
  user_id: string;

  @PrimaryColumn({ type: 'varchar', length: 50 })
  department_id: string;

  @PrimaryColumn({
    type: 'varchar',
    length: 20,
    // 這裡加上 enum 限制，對應資料庫的 CHECK constraint
  })
  role: DepartmentRole; 

  @PrimaryColumn({ type: 'varchar', length: 10 })
  start_semester: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  end_semester: string;
}