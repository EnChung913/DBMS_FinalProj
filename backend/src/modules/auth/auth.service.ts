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

  /* -----------------------------------------------------------
      產生 access + refresh tokens
    -----------------------------------------------------------*/
	async generateTokens(user: User) {
		const payload = { sub: user.user_id, role: user.role };

		const accessToken = await this.jwtService.signAsync(payload, {
			expiresIn: '15m',
		});

		const refreshToken = await this.jwtService.signAsync(payload, {
			expiresIn: '7d',
		});

		// === 新增：產生 refresh token hash ===
		const hashedRT = crypto
			.createHash('sha256')
			.update(refreshToken)
			.digest('hex');

		// === 寫入 Redis（用 hash 當 key，而不是 token 原文） ===
		await this.redis.set(
			`refresh:${hashedRT}`,
			String(user.user_id),
			'EX',
			7 * 24 * 3600,
		);

		return { accessToken, refreshToken };
	}

  private async checkProfileFilled(user: User) {
    if (user.role === 'student') {
      const count = await this.dataSource.getRepository(StudentProfile)
        .count({ where: { user_id: user.user_id } });

      return count > 0;
    }

    if (user.role === 'company') {
      const count = await this.dataSource.getRepository(CompanyProfile)
        .count({ where: { user_id: user.user_id } });

      return count > 0;
    }

    if (user.role === 'admin') {
      const count = await this.dataSource.getRepository(DepartmentProfile)
        .count({ where: { user_id: user.user_id } });

      return count > 0;
    }

    return false;
  }


  // register and auto login
  async register(dto: RegisterDto) {
    const {
      username,
      email,
      password,
      role,
      real_name,
      nickname,
    } = dto;

    // check if email or username existed
    const existed = await this.userRepo.findOne({
      where: [{ email }, { username }],
    });
    if (existed) {
      throw new BadRequestException('Email or username already exists');
    }

    const hashedPw = await bcrypt.hash(password, 10);

    // create user
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
    console.log('Registered new user:', user.user_id);
    // registration successful, auto login
    const tokens = await this.generateTokens(user);

    const { password: _, ...safeUser } = user;
    const profileFilled = await this.checkProfileFilled(user);
    return {
      user: safeUser,
      ...tokens,
      needProfile: !profileFilled,
    };
  }


  // Login
  async login(dto: LoginDto) {
    const { identifier, password } = dto;

    // identifier = username or email
    const user = await this.userRepo.findOne({
      where: [
        { username: identifier },
        { email: identifier },
      ],
    });

    if (!user) {
      throw new BadRequestException('User not exists, please register first');
    }

    const pwMatches = await bcrypt.compare(password, user.password);
    if (!pwMatches) {
      throw new BadRequestException('Invalid username/email or password');
    }

    const tokens = await this.generateTokens(user);
    const { password: _, ...safeUser } = user;
    const profileFilled = await this.checkProfileFilled(user);
    return {
      user: safeUser,
      ...tokens,
      needProfile: !profileFilled,
    };
  }

  /* -----------------------------------------------------------
      Refresh token → 發新 access token
    -----------------------------------------------------------*/
	async refresh(refreshToken: string) {
		// === Step 0：先把 refresh token 做 hash ===
		const hashedRT = crypto
			.createHash('sha256')
			.update(refreshToken)
			.digest('hex');

		// Step 1：查 Redis session
		const userId = await this.redis.get(`refresh:${hashedRT}`);
		if (!userId) {
			throw new UnauthorizedException('Session expired or invalid');
		}

		// Step 2：驗證 refresh token 的 JWT 有效性
		let payload: any;
		try {
			payload = await this.jwtService.verifyAsync(refreshToken);
		} catch {
			throw new UnauthorizedException('Invalid refresh token');
		}

		// Step 3：查 user
		const user = await this.userRepo.findOne({ where: { user_id: userId } });
		if (!user) throw new UnauthorizedException('User no longer exists');

		// Step 4：刪掉舊 refresh token session（Rotation）
		await this.redis.del(`refresh:${hashedRT}`);

		// Step 5：重新簽新的 tokens（自動寫入新的 refresh token session）
		const { accessToken, refreshToken: newRefreshToken } =
			await this.generateTokens(user);

		const profileFilled = await this.checkProfileFilled(user);

		return {
			accessToken,
			refreshToken: newRefreshToken,
			role: user.role,
			needProfile: !profileFilled,
		};
	}


  /* -----------------------------------------------------------
      登出（刪除 session）
    -----------------------------------------------------------*/
	async logout(refreshToken: string) {
		const hashedRT = crypto
			.createHash('sha256')
			.update(refreshToken)
			.digest('hex');

		await this.redis.del(`refresh:${hashedRT}`);
		return { success: true };
	}
}
