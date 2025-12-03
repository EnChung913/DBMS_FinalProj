import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('student_gpa')
export class StudentGpa {
  @PrimaryColumn('uuid')
  user_id: string;

  @PrimaryColumn({ type: 'varchar', length: 10 })
  semester: string;

  @Column({ type: 'float', nullable: true })
  gpa: number;
}
