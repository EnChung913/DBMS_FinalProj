import { Controller, UseGuards, Post, Get, Body, Res, Req, HttpCode } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // For testing if the access token is valid
  @Post('test')
  async verifyAccessToken(@Body('accessToken') accessToken: string) {
    return this.authService.verifyAccessToken(accessToken);
  }


  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res() res: Response
  ) {
    const {
      accessToken,
      refreshToken,
      user,
      needProfile,
    } = await this.authService.login(dto);

    const isProd = process.env.NODE_ENV === 'production';

    // 設定 ACCESS TOKEN Cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
    });

    // 設定 REFRESH TOKEN Cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
    });

    return res.json({
      user,
      needProfile,
    });
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      return res.status(401).json({
        message: 'No refresh token provided',
      });
    }

    const isProd = process.env.NODE_ENV === 'production';
    const { accessToken } = await this.authService.refresh(refreshToken);

    // 回傳新的 access_token（寫回 cookie）
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
    });

    return res.json({ ok: true });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req) {
    return req.user;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    // 1. 從 cookie 取得 refresh_token
    const refreshToken = req.cookies['refresh_token'];

    // 2. 呼叫 service 刪除 Redis Session
    await this.authService.logout(refreshToken);

    // 3. 清除前端 cookie
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });

    // 4. 回傳
    return res.json({ ok: true });
  }
}
