import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity'; // 請確認路徑是否正確

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwtPayload = request.user; // 這是 { sub: 'uuid...', role: '...' }

    console.log('AdminGuard check payload:', jwtPayload);

    // 1. 如果沒有 JWT Payload，代表沒登入
    if (!jwtPayload || !jwtPayload.sub) {
      throw new UnauthorizedException('User not found in request');
    }

    // 2. 使用 user_id (sub) 去資料庫查真正的 User 資料
    const user = await this.userRepo.findOne({
      where: { user_id: jwtPayload.sub },
      select: ['user_id', 'is_admin'], // 只撈需要的欄位，效能較好
    });

    // 3. 檢查是否存在且是否為 admin
    if (user && user.is_admin === true) {
      return true; // 放行
    }

    throw new ForbiddenException('Access denied: Admins only');
  }
}