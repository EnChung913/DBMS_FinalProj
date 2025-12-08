import { IsEmail, IsNotEmpty, IsString, Length, IsIn } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 50)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 50)
  password: string;

  @IsString()
  @Length(1, 50)
  real_name: string;

  @IsString()
  @Length(1, 50)
  nickname: string;

  @IsIn(['student', 'department', 'company'])
  role: string;
}
