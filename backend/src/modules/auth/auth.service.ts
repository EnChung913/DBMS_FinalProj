import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LineString } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

import { User } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { StudentProfile } from '../../entities/student-profile.entity';

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
      return await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
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
      secret: process.env.JWT_SECRET,
      // For development use longer expiry
      // TODO: Change to 15m in production
      expiresIn: '10d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '70d',
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
    const failKey = `login:fail:${identifier}`;
    const lockKey = `login:lock:${identifier}`;

    const fails = await this.redis.incr(failKey);

    if (fails === 1) {
      await this.redis.expire(failKey, 300); // 5 minutes
    }

    if (fails >= 5) {
      await this.redis.set(lockKey, 'locked', 'EX', 3600); // 1 hour lock

      throw new UnauthorizedException(
        'Too many failed attempts. Account locked for 1 hour. Use 2FA to unlock in 1 hour.'
      );
    }
    // fail 1~4
    throw new UnauthorizedException(`Invalid password (${fails}/5)`);
  }

  async unlockAccount(identifier: string) {
    await this.redis.del(`login:lock:${identifier}`);
    await this.redis.del(`login:fail:${identifier}`);
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
      return await this.dataSource
        .getRepository(StudentProfile)
        .exists({ where: { user_id: user.user_id } });
    }

    // company or department does not need profile setup
    if (user.role === 'company' || user.role === 'department') {
      return true;
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
      console.log('Existed user tried to register:', username, email);
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

    const lockKey = `login:lock:${identifier}`;
    const locked = await this.redis.get(lockKey);

    if (locked) {
      throw new BadRequestException('Account locked, require 2fa');
    }

    const pwMatches = await bcrypt.compare(password, user.password);
    if (!pwMatches) {
      await this.addLoginFail(identifier);
      throw new BadRequestException('Invalid credentials');
    }

    await this.clearLoginFail(identifier);

    await this.clearOldSessions(user.user_id);

    const tokens = await this.generateTokens(user);

    const { password: _, ...safeUser } = user;
    const profileFilled = await this.checkProfileFilled(user);
    console.log(`User ${user.user_id} logged in successfully at ${new Date().toISOString()}`);
    console.log('Profile filled status:', profileFilled);
    return {
      user: safeUser,
      ...tokens,
      needProfile: !profileFilled,
    };
  }

  /* ===========================================================
     Refresh（Token Rotation）
     ===========================================================*/
  async refresh(refreshToken: string) {
    const hashedRT = this.hashRefreshToken(refreshToken);
    
    // 3. 驗 refresh token
    let rtPayload: any;
    try {
      rtPayload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET,
      });

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
    const redisUserId = String(userId);

    if (rtSub !== redisUserId) {
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
     2FA modules
     ===========================================================*/
  // 1. generate secret + QRCode
  async generate2FASecret(userId: string) {
    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const secret = speakeasy.generateSecret({
      name: `UniConnect (${user.username})`,
      length: 32,
    });

    // store at redis 10 minutes
    const key = `2fa:pending:${userId}`;
    await this.redis.set(key, secret.base32, 'EX', 600);  

    const qrDataURL = await qrcode.toDataURL(secret.otpauth_url);

    return {
      otpauth_url: secret.otpauth_url,
      secret: secret.base32,
      qr: qrDataURL,
    };
  }

  verifyOtp(secret: string | null, token: string): boolean {
    if (!secret) return false;
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }
  // 3. enable 2FA for user
  async enable2FA(userId: string, code: string) {
    const pendingKey = `2fa:pending:${userId}`;
    const secret = await this.redis.get(pendingKey);

    if (!secret) {
      throw new BadRequestException('2FA setup expired or not started.');
    }

    const valid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) {
      throw new UnauthorizedException('Invalid OTP.');
    }

    // 重要：成功後才寫入 DB
    await this.userRepo.update(userId, {
      otp_secret: secret,
      is_2fa_enabled: true,
    });

    // 清除 Redis 暫存資料
    await this.redis.del(pendingKey);

    return { enabled: true };
  }


  // 4. 用 2FA 解鎖 Redis 鎖定
  async unlockAccountBy2FA(userId: string, code: string) {
    const user = await this.userRepo.findOne({ where: { user_id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (!user.is_2fa_enabled) {
      throw new UnauthorizedException('You must enable 2FA first.');
    }

    const ok = this.verifyOtp(user.otp_secret, code);
    if (!ok) throw new UnauthorizedException('Invalid OTP.');

    // 清除 redis 鎖
    await this.redis.del(`login:lock:${userId}`);
    await this.redis.del(`login:fail:${userId}`);

    return { unlocked: true };
  }

  /* ===========================================================
     Logout（刪除 session）
     ===========================================================*/
  async logout(refreshToken?: string) {
    if (!refreshToken) {
      console.log('No refresh token found in cookies.');
      return { success: true };
    }

    const hashedRT = this.hashRefreshToken(refreshToken);
    await this.redis.del(`refresh:${hashedRT}`);

    console.log(`Refresh token session ${hashedRT} deleted.`);
    return { success: true };
  }

}
