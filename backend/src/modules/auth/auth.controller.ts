import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('test')
  async verifyAccessToken(@Body('accessToken') accessToken: string) {
    return this.authService.verifyAccessToken(accessToken);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    console.log('refresh dto = ', dto);

    return this.authService.refresh(dto.refreshToken, dto.expiredAccessToken);
  }

  @Post('logout')
  async logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }
}
