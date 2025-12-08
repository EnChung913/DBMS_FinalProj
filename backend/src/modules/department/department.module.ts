import { Module } from '@nestjs/common';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Achievement } from '../../entities/achievement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Achievement])],
  controllers: [DepartmentController],
  providers: [DepartmentService],
})
export class DepartmentModule {}
