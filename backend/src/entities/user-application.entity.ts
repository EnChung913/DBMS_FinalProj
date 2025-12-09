import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity'; 

@Entity('user_application')
export class UserApplication {
  @PrimaryGeneratedColumn('uuid', { name: 'application_id' })
  applicationId: string;

  @Column({ name: 'real_name', length: 50 })
  realName: string;

  @Column({ length: 50 })
  email: string;

  @Column({ length: 50 })
  username: string;

  @Column({ length: 128 })
  password: string; 

  @Column({ length: 50 })
  nickname: string;

  @Column({ length: 20 })
  role: string; // 'department' | 'company'

  @Column({ name: 'org_name', length: 100 })
  orgName: string;

  @CreateDateColumn({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date;

  @Column({ length: 20, default: 'pending' })
  status: string; // 'pending' | 'approved' | 'rejected'

  @CreateDateColumn({ name: 'submit_time', type: 'timestamptz' })
  submitTime: Date;

  @Column({ name: 'review_time', type: 'timestamptz', nullable: true })
  reviewTime: Date;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedById: string;

  // 關聯到 Admin User (審核者)
  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @Column({ name: 'review_comment', type: 'text', nullable: true })
  reviewComment: string;
}