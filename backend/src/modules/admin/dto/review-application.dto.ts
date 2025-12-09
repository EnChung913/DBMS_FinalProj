import { IsIn, IsString, IsOptional } from 'class-validator';

export class ReviewApplicationDto {
  @IsIn(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string; // 審核備註 (例如退回理由)
}