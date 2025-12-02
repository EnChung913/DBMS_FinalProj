import { IsString, IsInt, IsOptional, IsDateString, IsIn, IsBoolean } from 'class-validator';

export class CreateResourceDto {
  @IsIn(['Scholarship','Internship','Lab','Others'])
  resource_type: string;

  @IsInt()
  quota: number;

  @IsOptional()
  @IsString()
  department_supplier_id?: string;

  @IsOptional()
  @IsString()
  company_supplier_id?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsString()
  description: string;

}