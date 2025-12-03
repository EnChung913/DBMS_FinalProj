import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('achievement')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  achievement_id: string;

  @Column('uuid')
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  category: string;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'date', nullable: true })
  start_date: string;

  @Column({ type: 'date', nullable: true })
  end_date: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  creation_date: Date;

  @Column({ type: 'varchar', length: 20 })
  status: string;
}
