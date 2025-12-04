import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('student_profile')
export class StudentProfile {
  @PrimaryColumn()
  user_id: string;

  @OneToOne(() => User, (user) => user.studentProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 10 })
  student_id: string;

  @Column({ length: 10 })
  department_id: string;

  @Column({ name: 'entry_year', type: 'int' })
  entry: number;

  @Column({ name: 'is_poor', type: 'boolean', default: false })
  is_poor: boolean;

  @Column({ type: 'int' })
  grade: number;
}
