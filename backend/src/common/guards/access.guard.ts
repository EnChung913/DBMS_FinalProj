import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DataSource } from 'typeorm';
import { StudentProfile } from '../../entities/student-profile.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { DepartmentProfile } from '../../entities/department-profile.entity';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // 由 JwtAuthGuard 填入

    if (!user) throw new ForbiddenException('Unauthorized');

    // --- 1. 角色檢查 ---
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `You do not have permission to access this resource.`,
      );
    }

    // --- 2. Profile 檢查 ---
    const filled = await this.checkProfileFilled(user);

    if (!filled) {
      throw new ForbiddenException('Please complete your profile first.');
    }

    return true;
  }

  private async checkProfileFilled(user: any): Promise<boolean> {
    const repoMap = {
      student: StudentProfile,
      department: DepartmentProfile,
      company: CompanyProfile,
    };

    const repo = repoMap[user.role];
    if (!repo) return false; 

    const count = await this.dataSource.getRepository(repo)
      .count({ where: { user_id: user.sub } });

    return count > 0;
  }
}
