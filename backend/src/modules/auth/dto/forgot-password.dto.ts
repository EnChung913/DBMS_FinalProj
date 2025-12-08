import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckEmailDto {
  @ApiProperty({ example: 'student@ntu.edu.tw' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class Verify2FaResetDto {
  @ApiProperty({ example: 'student@ntu.edu.tw' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @Length(6, 6)
  code: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'The temporary JWT token received from verify-2fa step' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewStrongPassword123!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}