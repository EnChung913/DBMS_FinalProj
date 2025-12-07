import { Controller, UseGuards, Post, Get, Body, Res, Req, HttpCode } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // For testing if the access token is valid
  @Post('test')
  @ApiOperation({ summary: 'Verify Access Token' })
  @ApiResponse({ status: 200, description: 'Access token is valid.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired access token.' })
  async verifyAccessToken(@Body('accessToken') accessToken: string) {
    return this.authService.verifyAccessToken(accessToken);
  }


  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully.' })
  @ApiResponse({ status: 400, description: 'Email or username already exists.' })
  async register(
    @Body() dto: RegisterDto,
    @Res() res: Response
  ) {
    const {
      user,
      accessToken,
      refreshToken,
      needProfile,
    } = await this.authService.register(dto);

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


  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'User logged in successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid credentials or account locked.' })
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
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Access token refreshed successfully.' })
  @ApiResponse({ status: 401, description: 'No refresh token provided or invalid refresh token.' })
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
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({ status: 200, description: 'Current user info retrieved successfully.' })
  me(@Req() req) {
    return req.user;
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'User logged out successfully.' })
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

  // Step 1: 產生2FA secret + QRCode
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: '2FA secret and QR code generated successfully.' })
  async generate2FA(@Req() req: any) {
    return this.authService.generate2FASecret(req.user.sub);
  }

  // Step 2: 驗證啟用2FA
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable 2FA' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully.' })
  async enable2FA(@Req() req: any, @Body() dto: { code: string }) {
    return this.authService.enable2FA(req.user.sub, dto.code);
  }

  // 用於登入失敗鎖定後的解鎖
  @UseGuards(JwtAuthGuard)
  @Post('2fa/unlock')
  @ApiOperation({ summary: 'Unlock account using 2FA' })
  @ApiResponse({ status: 200, description: 'Account unlocked successfully.' })
  async unlock(@Req() req: any, @Body() dto: { code: string }) {
    return this.authService.unlockAccountBy2FA(req.user.sub, dto.code);
  }

  // User 要 reset password 時 → 需要 2FA
  // @UseGuards(JwtAuthGuard)
  // @Post('2fa/verify-for-reset')
  // async verifyForReset(@Req() req: any, @Body() dto: { code: string }) {
  //   const user = await this.authService.verifyForPasswordReset(req.user.sub, dto.code);
  //   return user;
  // }
}
