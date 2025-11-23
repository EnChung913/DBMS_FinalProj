import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RedisModule } from '../redis/redis.module';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategy/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { DepartmentProfile } from '../../entities/department-profile.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';



@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([
      User,
      StudentProfile,
      DepartmentProfile,
      CompanyProfile,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '15m' },
    }),
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
