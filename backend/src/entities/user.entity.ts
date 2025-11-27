import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { StudentProfile } from './student-profile.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ length: 50 })
  real_name: string;

  @Column({ length: 50, unique: true })
  email: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 128 })
  password: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ length: 20 })
  role: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  otp_secret: string | null;

  @Column({ default: false })
  is_2fa_enabled: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  registered_at: Date;

  @Column({ type: 'timestamp', default: () => '9999-12-31 23:59:59' })
  deleted_at: Date;

  @OneToOne(() => StudentProfile, (profile) => profile.user)
  studentProfile: StudentProfile;
}
