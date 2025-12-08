import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          // 優先從 HttpOnly Cookie 讀取
          if (req?.cookies?.access_token) {
            return req.cookies.access_token;
          }

          // 若你想支援 Postman 等外部測試，也可以保留 header
          const authHeader = req.headers['authorization'];
          if (
            typeof authHeader === 'string' &&
            authHeader.startsWith('Bearer ')
          ) {
            return authHeader.slice(7);
          }

          return null;
        },
      ]),

      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    console.log('Validating JWT payload:', payload);

    return {
      sub: payload.sub, // user_id
      role: payload.role, // user.role
    };
  }
}
