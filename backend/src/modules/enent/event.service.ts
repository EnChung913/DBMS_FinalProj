import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class EventService {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  /**
   * 追蹤學生對資源的點擊
   */
  async trackResourceClick(
    uid: string,
    rid: string,
    resourceType?: string,
  ) {
    const now = Date.now();
    const p = this.redis.pipeline();

    // 1) 使用者 -> 資源 (user-based CF)
    p.zincrby(`user:${uid}:resource:clicks`, 1, rid);

    // 2) 資源 -> 使用者 (item-based CF)
    p.zadd(`resource:${rid}:viewed_by`, now, uid);

    // 3) 使用者偏好 (content-based CF)
    if (resourceType) {
      p.zincrby(`user:${uid}:type:clicks`, 1, resourceType);
    }

    // 4) 全局熱門資源
    p.zincrby(`resource:global:clicks`, 1, rid);

    await p.exec();
  }

  /**
   * 追蹤企業查看學生（for 公司推薦）
   */
  async trackStudentView(
    companyId: string,
    studentId: string,
  ) {
    const now = Date.now();
    const p = this.redis.pipeline();

    // 公司 -> 學生
    p.zincrby(`company:${companyId}:view_students`, 1, studentId);

    // 學生 -> 公司
    p.zadd(`student:${studentId}:viewed_by`, now, companyId);

    // 全局熱門學生
    p.zincrby(`student:global:views`, 1, studentId);

    await p.exec();
  }
}
