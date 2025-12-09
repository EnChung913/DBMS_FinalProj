import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserApplication } from '../../entities/user-application.entity';
import { User } from '../../entities/user.entity';
import { ReviewApplicationDto } from './dto/review-application.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserApplication)
    private userApplicationRepo: Repository<UserApplication>,
    private dataSource: DataSource, // 用於交易處理
  ) {}

  // 1. 取得所有待審核名單
  async findAllPending() {
    return this.userApplicationRepo.find({
      where: { status: 'pending' },
      order: { submitTime: 'ASC' }, // 依照申請時間排序，先申請的先審
      // 如果你想看是誰審核的，可以 select 相關欄位，但在 pending 狀態通常還沒人審
    });
  }

  // 2. 審核邏輯 (Approved / Rejected)
  async reviewApplication(id: string, dto: ReviewApplicationDto, adminId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 步驟 A: 鎖定並取得該申請單
      const application = await queryRunner.manager.findOne(UserApplication, {
        where: { applicationId: id },
      });

      if (!application) {
        throw new NotFoundException('Application not found');
      }

      if (application.status !== 'pending') {
        throw new BadRequestException('This application has already been processed');
      }

      // 步驟 B: 更新申請單狀態
      application.status = dto.status;
      application.reviewTime = new Date();
      application.reviewedById = adminId; // 紀錄是哪位 Admin 審核的
      application.reviewComment = dto.comment ?? '';

      await queryRunner.manager.save(application);

      // 步驟 C: 如果是 "approved"，將資料複製到正式 User 表
      if (dto.status === 'approved') {
        // C-1: 最後防線，再次檢查 Email/Username 是否衝突
        const existingUser = await queryRunner.manager.findOne(User, {
          where: [
              { email: application.email }, 
              { username: application.username }
          ]
        });

        if (existingUser) {
           throw new ConflictException('User with this email or username already exists in the active users table.');
        }

        // C-2: 建立正式使用者
        const newUser = queryRunner.manager.create(User, {
          username: application.username,
          email: application.email,
          password: application.password, // 這是已經 hash 過的密碼
          real_name: application.realName,
          nickname: application.nickname,
          role: application.role,
          // 👇 關鍵：記得把公司/系所名稱帶過去
          // 請確認你的 User Entity 有 org_name 或 orgName 欄位
          org_name: application.orgName, 
          
          has_filled_profile: false, // 剛審核過，當然還沒填 profile
          // created_at 會自動生成
        });

        await queryRunner.manager.save(newUser);
      }

      // 提交交易
      await queryRunner.commitTransaction();

      return { 
        message: `Application has been ${dto.status}`, 
        applicationId: id 
      };

    } catch (err) {
      // 發生錯誤，回滾所有操作
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}