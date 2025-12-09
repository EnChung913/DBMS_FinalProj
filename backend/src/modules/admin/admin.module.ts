import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { DataSource } from 'typeorm';
import { UserApplication } from '../../entities/user-application.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      DataSource,
      UserApplication,
      User,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
