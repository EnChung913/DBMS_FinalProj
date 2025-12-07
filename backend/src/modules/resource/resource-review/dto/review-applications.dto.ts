// dto/review-applications.dto.ts
import { IsArray, IsEnum, IsString } from 'class-validator';

export class ReviewApplicationsDto {
  @IsEnum(['approved', 'rejected'])
  decision: 'approved' | 'rejected';

  @IsArray()
  @IsString({ each: true })
  student_ids: string[]; // 這裡存的是學生的 user_id (UUID)
}