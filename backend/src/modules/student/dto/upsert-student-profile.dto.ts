import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsPhoneNumber,
} from 'class-validator';

export class UpsertStudentProfileDto {
  @IsString()
  @IsNotEmpty()
  student_id: string;

  @IsString()
  @IsNotEmpty()
  department: string;

  @IsInt()
  @Min(1)
  @Max(8)
  grade: number;

  @IsOptional()
  @IsPhoneNumber('TW')
  phone?: string;

  // 表單上的「是否啟用 OTP 驗證」選項
  @IsOptional()
  @IsBoolean()
  wantsOtp?: boolean;
}