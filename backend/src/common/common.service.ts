import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentProfile } from '../entities/department-profile.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class CommonService {
  constructor(
    @InjectRepository(DepartmentProfile)
    private readonly deptRepo: Repository<DepartmentProfile>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async getDepartments() {
    const rows = await this.deptRepo.find({
      select: ['department_id', 'department_name'],
      order: { department_id: 'ASC' },
    });

    return rows.map((d) => ({
      id: d.department_id,
      name: d.department_name,
    }));
  }

  async setAdmin(callerId: string, targetUsername: string) {
    // 1. 檢查呼叫者是否為 admin
    const caller = await this.userRepo.findOne({
      where: { user_id: callerId },
    });

    if (!caller) throw new NotFoundException('Caller not found');

    if (!caller.is_admin) {
      throw new ForbiddenException('Only admin can promote others');
    }

    // 2. 找 target user
    const target = await this.userRepo.findOne({
      where: { username: targetUsername },
    });

    if (!target) throw new NotFoundException('Target user not found');

    // 3. 更新 targetUser 為 admin
    await this.userRepo.update(
      { username: targetUsername },
      {
        is_admin: true,
      },
    );

    return { message: 'User promoted to admin', user_name: targetUsername };
  }
}
