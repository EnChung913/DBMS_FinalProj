import {
  IsOptional,
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  Length,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAchievementDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Competition', 'Research', 'Intern', 'Project', 'Service', 'Others'])
  category: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  description: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  start_date?: string | null;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => (value === '' ? undefined : value))
  end_date?: string | null;
}
