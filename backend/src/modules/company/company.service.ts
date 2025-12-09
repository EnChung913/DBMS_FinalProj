import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchStudentDto } from './dto/search-student.dto';
import { RefreshService } from './refreshData.service';

@Injectable()
export class CompanyService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly refreshService: RefreshService,
  ) {}

  async searchStudents(dto: SearchStudentDto) {
    if (await this.refreshService.shouldRefresh()) {
      await this.refreshService.refreshMV();
    }
    console.log('SearchStudentDto:', dto);
    return this.dataSource.query(
      `
      SELECT *
      FROM student_search_mv
      WHERE
      ($1::VARCHAR IS NULL OR department_id = $1)
      AND ($2::INT IS NULL OR entry_year = $2)
      AND ($3::INT IS NULL OR grade = $3)
      AND ($4::FLOAT IS NULL OR current_gpa >= $4)
      AND ($5::FLOAT IS NULL OR avg_gpa >= $5)
      AND ($6::TEXT[] IS NULL OR courses_taken::TEXT[] && $6::TEXT[])
      LIMIT $7 OFFSET $8;
      `,
      [
        dto.department_id ?? null,
        dto.entry_year ?? null,
        dto.grade ?? null,
        dto.min_current_gpa ?? null,
        dto.min_avg_gpa ?? null,
        dto.courses_id ?? null,
        dto.limit ?? 50,
        dto.offset ?? 0,
      ],
    );
  }
}
