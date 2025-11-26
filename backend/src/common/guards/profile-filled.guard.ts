import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StudentProfile } from '../../entities/student-profile.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { DepartmentProfile } from '../../entities/department-profile.entity';


@Injectable()
export class ProfileFilledGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();

    const mapping = {
      student: StudentProfile,
      company: CompanyProfile,
      department: DepartmentProfile,
    };

    const repo = mapping[user.role];
    const count = await this.dataSource.getRepository(repo)
      .count({ where: { user_id: user.sub } });

    return count > 0;
  }
}
