import { IsString, Length, IsOptional, IsInt, Min } from 'class-validator';

export class UpsertStudentProfileDto {
  @IsString()
  @Length(1, 10)
  student_id: string;

  @IsString()
  @Length(1, 10)
  department_id: string;

  @IsOptional()
  @IsString()
  entry?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  grade?: number;
}
