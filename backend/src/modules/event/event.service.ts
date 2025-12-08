import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class EventService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async trackResourceClick(uid: string, rid: string, resourceType?: string) {
    // 加上 try-catch 避免 crash，雖然 controller 層可能處理了，但在 service 處理更保險
    try {
      const now = Date.now();
      const p = this.redis.pipeline();

      // 1. User History (強度)
      p.zincrby(`user:${uid}:resource:clicks`, 1, rid);

      // 2. Resource Viewers (供相似度計算 - item-based)
      // 使用 timestamp 當 score，方便知道"最近"誰看過
      p.zadd(`resource:${rid}:viewed_by`, now, uid);
      // 可選：設定該 Key 90 天後過期 (若資源本身也有生命週期)
      p.expire(`resource:${rid}:viewed_by`, 60 * 60 * 24 * 90);

      // 3. User Preference (類別偏好)
      if (resourceType) {
        // 這裡建議轉小寫或統一名稱，避免 'Internship' 和 'internship' 被當成兩個
        p.zincrby(`user:${uid}:type:clicks`, 1, resourceType.toLowerCase());
      }

      // 4. Global Popularity
      p.zincrby(`resource:global:clicks`, 1, rid);

      await p.exec();
    } catch (error) {
      // 埋點失敗通常只記 Log，不拋出錯誤中斷業務
      console.error('Redis trackResourceClick error:', error);
    }
  }

  async trackStudentView(companyId: string, studentId: string) {
    try {
      const now = Date.now();
      const p = this.redis.pipeline();

      // 1. Company History
      p.zincrby(`company:${companyId}:student:clicks`, 1, studentId);

      // 2. Student Viewers (供相似度計算 - user-based)
      p.zadd(`student:${studentId}:viewed_by_company`, now, companyId);

      // 3. Global Popularity (這會影響 Popularity Score)
      p.zincrby(`student:global:views`, 1, studentId);

      await p.exec();
    } catch (error) {
      console.error('Redis trackStudentView error:', error);
    }
  }
}
