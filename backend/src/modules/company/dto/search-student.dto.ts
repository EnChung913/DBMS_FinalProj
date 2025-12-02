import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchStudentDto {
  // --------- 基本背景 ---------
  @IsOptional()
  @IsString()
  department_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  entry_year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grade?: number;

  // --------- GPA 條件 ---------
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_current_gpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  min_avg_gpa?: number;

  // --------- 課程 / 成就 ---------
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  courses?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];

  // --------- 分頁 ---------
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset: number = 0;
}
