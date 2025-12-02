import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpsertResourceConditionDto {
  @IsString()
  department_id: string; // eligibility 限制的系所

  @IsOptional()
  @IsNumber()
  avg_gpa?: number;

  @IsOptional()
  @IsNumber()
  current_gpa?: number;

  @IsOptional()
  @IsBoolean()
  is_poor?: boolean;
}
