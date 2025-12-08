import {
  IsString,
  Length,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
} from 'class-validator';

export class UpsertStudentProfileDto {
  @IsString()
  @Length(1, 10)
  @IsNotEmpty()
  student_id: string;

  @IsString()
  @Length(1, 10)
  @IsNotEmpty()
  department_id: string;

  @IsInt()
  @IsNotEmpty()
  entry: number;

  @IsOptional()
  is_poor?: boolean;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  grade: number;
}
