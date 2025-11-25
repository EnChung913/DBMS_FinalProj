import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

import { User } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { StudentProfile } from '../../entities/student-profile.entity';
import { CompanyProfile } from '../../entities/company-profile.entity';
import { DepartmentProfile } from '../../entities/department-profile.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly jwtService: JwtService,

    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  /* ===========================================================
     JWT 驗證 Access Token（可給後端任意地方使用）
     ===========================================================*/
  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  /* ===========================================================
     Refresh Token Hash
     ===========================================================*/
  private hashRefreshToken(rt: string) {
    return crypto.createHash('sha256').update(rt).digest('hex');
    // 產生 64 hex characters
  }

  /* ===========================================================
     產生 access + refresh tokens（同時寫入 Redis）
     ===========================================================*/
  async generateTokens(user: User) {
    const payload = { sub: user.user_id, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    // refresh token hash
    const hashedRT = this.hashRefreshToken(refreshToken);

    // 寫入 Redis（多裝置支援，一個裝置一個 session）
    await this.redis.set(
      `refresh:${hashedRT}`,
      String(user.user_id),
      'EX',
      7 * 24 * 3600,
    );

    return { accessToken, refreshToken };
  }

  /* ===========================================================
     Login 節流防護（防止暴力破解）
     key: login:fail:<identifier>
     ===========================================================*/
  // TODO: Login Fail 5 times, usr need to verify Authenticator app or Email to continue
  private async addLoginFail(identifier: string) {
    const key = `login:fail:${identifier}`;
    const fails = await this.redis.incr(key);
    if (fails === 1) {
      await this.redis.expire(key, 300); // 5 minutes
    }
    if (fails === 5) {
      await this.redis.expire(key, 300); // 5 minutes
      throw new UnauthorizedException('Too many failed attempts. Try later.');
    }
    if (fails > 5) {
      const ttl = await this.redis.ttl(key);
      throw new UnauthorizedException(
        `Too many failed attempts. Try again in ${ttl} seconds.`
      );
    }
  }

  private async clearLoginFail(identifier: string) {
    await this.redis.del(`login:fail:${identifier}`);
  }

  /* ===========================================================
     清除舊 refresh sessions（若你不想多裝置）
     ===========================================================*/
  private async clearOldSessions(userId: string) {
    const keys = await this.redis.keys('refresh:*');
    if (!keys.length) return;

    const pipeline = this.redis.pipeline();

    for (const key of keys) {
      const storedUserId = await this.redis.get(key);
      if (storedUserId === userId) {
        pipeline.del(key);
      }
    }
    await pipeline.exec();
  }

  private async checkProfileFilled(user: User) {
    if (user.role === 'student') {
      const count = await this.dataSource
        .getRepository(StudentProfile)
        .count({ where: { user_id: user.user_id } });
      return count > 0;
    }

    if (user.role === 'company') {
      const count = await this.dataSource
        .getRepository(CompanyProfile)
        .count({ where: { user_id: user.user_id } });
      return count > 0;
    }

    if (user.role === 'admin') {
      const count = await this.dataSource
        .getRepository(DepartmentProfile)
        .count({ where: { user_id: user.user_id } });
      return count > 0;
    }

    return false;
  }

  /* ===========================================================
     Register + auto login
     ===========================================================*/
  async register(dto: RegisterDto) {
    const { username, email, password, role, real_name, nickname } = dto;

    const existed = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existed) {
      throw new BadRequestException('Email or username already exists');
    }

    const hashedPw = await bcrypt.hash(password, 10);

    const user = await this.dataSource.transaction(async manager => {
      const entity = manager.create(User, {
        username,
        email,
        password: hashedPw,
        real_name,
        nickname,
        role,
        has_filled_profile: false,
      });
      await manager.save(User, entity);
      return entity;
    });

    const tokens = await this.generateTokens(user);

    const { password: _, ...safeUser } = user;
    const profileFilled = await this.checkProfileFilled(user);

    return {
      user: safeUser,
      ...tokens,
      needProfile: !profileFilled,
    };
  }

  /* ===========================================================
     Login（加入節流 + 清除舊 sessions）
     ===========================================================*/
  async login(dto: LoginDto) {
    const { identifier, password } = dto;

    const user = await this.userRepo.findOne({
      where: [{ username: identifier }, { email: identifier }],
    });

    if (!user) throw new BadRequestException('User not exists');

    const pwMatches = await bcrypt.compare(password, user.password);
    if (!pwMatches) {
      await this.addLoginFail(identifier);
      throw new BadRequestException('Invalid credentials');
    }

    await this.clearLoginFail(identifier);

    // 若你不想支援多裝置，可啟用此行
    await this.clearOldSessions(user.user_id);

    const tokens = await this.generateTokens(user);

    const { password: _, ...safeUser } = user;
    const profileFilled = await this.checkProfileFilled(user);

    return {
      user: safeUser,
      ...tokens,
      needProfile: !profileFilled,
    };
  }

  /* ===========================================================
     Refresh（Token Rotation）
     ===========================================================*/
  async refresh(refreshToken: string, expiredAccessToken: string) {
    const hashedRT = this.hashRefreshToken(refreshToken);
    // To debug, but should not log in production
    // console.log('Decoded AT:', this.jwtService.decode(expiredAccessToken));
    // console.log('Now:', Math.floor(Date.now() / 1000));

    // Step 1: verify token signature, even if expired
    let accessPayload: any;
    try {
      accessPayload = await this.jwtService.verifyAsync(expiredAccessToken, {
        ignoreExpiration: true,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    // Step 2: manually check expiration
    const decoded: any = this.jwtService.decode(expiredAccessToken);

    if (!decoded || !decoded.exp) {
      throw new BadRequestException('Invalid access token');
    }

    const now = Math.floor(Date.now() / 1000);

    if (decoded.exp > now) {
      throw new BadRequestException('Access token is still valid');
    }

    // 3. 驗 refresh token
    let rtPayload: any;
    try {
      rtPayload = await this.jwtService.verifyAsync(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 4. 確認 refresh token 在 Redis 裡（session 還活著）
    const userId = await this.redis.get(`refresh:${hashedRT}`);
    if (!userId) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // 5. 確認 RT / AT / Redis user 一致
    const rtSub = String(rtPayload.sub);
    const atSub = String(accessPayload.sub);
    const redisUserId = String(userId);

    if (rtSub !== atSub || rtSub !== redisUserId) {
      throw new UnauthorizedException('Token payloads do not match');
    }

    // 6. 查 user
    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // 7. 刪掉舊 session（rotation）
    await this.redis.del(`refresh:${hashedRT}`);

    // 8. 產生新 tokens（並在 generateTokens 內記得寫入新的 RT -> userId 到 Redis）
    const { accessToken, refreshToken: newRT } = await this.generateTokens(user);

    const profileFilled = await this.checkProfileFilled(user);

    return {
      accessToken,
      refreshToken: newRT,
      role: user.role,
      needProfile: !profileFilled,
    };
  }


  /* ===========================================================
     Logout（刪除 session）
     ===========================================================*/
  async logout(refreshToken: string) {
    const hashedRT = this.hashRefreshToken(refreshToken);
    await this.redis.del(`refresh:${hashedRT}`);
    return { success: true };
  }
}
