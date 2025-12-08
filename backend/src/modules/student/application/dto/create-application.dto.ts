import { IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  resource_id: string;

  @IsOptional()
  @IsString()
  note?: string; // 可選補充描述
}
