import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpsertResourceConditionDto {
  @IsString()
  @IsOptional()
  department_id: string;

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
