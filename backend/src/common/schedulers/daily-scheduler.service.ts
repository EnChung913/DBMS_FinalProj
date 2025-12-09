import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

interface RawCourseRow {
  user_id: string;
  course_id: string;
}

interface RawDeptRow {
  user_id: string;
  department_id: string;
  role: string;
}

@Injectable()
export class DailySchedulerService {
  private readonly logger = new Logger(DailySchedulerService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

// ==========================================================
  // 每日 01:00 重算 學生相似度矩陣 (SQL -> Redis)
  // ==========================================================
  @Cron('0 1 * * *')
  async refreshSimilarityMatrixRedis() {
    this.logger.log('Start calculating Student Similarity Matrix (Raw SQL)...');
    const start = Date.now();

    // 1. 直接寫 SQL 撈取資料
    // query() 回傳的是 Promise<any[]>，我們手動轉型成我們定義的 interface
    const [courses, depts] = await Promise.all([
      this.dataSource.query(
        `SELECT user_id, course_id FROM student_course_record`
      ) as Promise<RawCourseRow[]>,
      
      this.dataSource.query(
        `SELECT user_id, department_id, role FROM student_department`
      ) as Promise<RawDeptRow[]>,
    ]);

    // 2. 建立特徵向量 Map (邏輯跟之前一模一樣)
    const userFeatures = new Map<string, Set<string>>();

    const addFeature = (uid: string, feature: string) => {
      if (!userFeatures.has(uid)) userFeatures.set(uid, new Set());
      userFeatures.get(uid)!.add(feature);
    };

    // 填入系所特徵
    depts.forEach((d) => addFeature(d.user_id, `dept:${d.department_id}_${d.role}`));
    
    // 填入修課特徵
    courses.forEach((c) => addFeature(c.user_id, `course:${c.course_id}`));

    const userIds = Array.from(userFeatures.keys());
    const totalUsers = userIds.length;
    this.logger.log(`Found ${totalUsers} students via Raw SQL.`);

    // 3. 計算 Jaccard 並寫入 Redis (邏輯跟之前一模一樣)
    const pipeline = this.redis.pipeline();
    let processedCount = 0;

    for (let i = 0; i < totalUsers; i++) {
      const u1 = userIds[i];
      const set1 = userFeatures.get(u1)!;
      const neighbors: { uid: string; score: number }[] = [];

      for (let j = 0; j < totalUsers; j++) {
        if (i === j) continue;
        const u2 = userIds[j];
        const set2 = userFeatures.get(u2)!;
        
        const score = this.calculateJaccard(set1, set2);
        if (score > 0.05) {
          neighbors.push({ uid: u2, score });
        }
      }

      neighbors.sort((a, b) => b.score - a.score);
      const top20 = neighbors.slice(0, 20);

      if (top20.length > 0) {
        const key = `user:${u1}:similar`;
        pipeline.del(key);
        for (const n of top20) {
          pipeline.zadd(key, n.score, n.uid);
        }
        pipeline.expire(key, 60 * 60 * 25);
        processedCount++;
      }
    }

    await pipeline.exec();

    const duration = (Date.now() - start) / 1000;
    this.logger.log(`Updated matrix for ${processedCount} users in ${duration}s.`);
  }

  // Jaccard Helper (不變)
  private calculateJaccard(setA: Set<string>, setB: Set<string>): number {
    let intersection = 0;
    const [small, large] = setA.size < setB.size ? [setA, setB] : [setB, setA];
    for (const item of small) {
      if (large.has(item)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // ==========================================================
  // [維持原樣] 每日 01:15 重算 公司相似度矩陣 (Redis Only)
  // 公司端沒有修課紀錄，使用「被瀏覽行為」來計算相似度依然是最合適的
  // ==========================================================
  @Cron('15 1 * * *')
  async refreshCompanySimilarityMatrix() {
    this.logger.log('Start calculating Company Similarity Matrix (Behavior-based)...');
    const start = Date.now();

    // 1. 取得所有有活躍紀錄的公司
    const companyKeys = await this.scanKeys('company:*:student:clicks');
    const companyIds = companyKeys.map((key) => key.split(':')[1]);

    for (const targetCid of companyIds) {
      await this.computeAndStoreCompanySimilarity(targetCid);
    }

    const duration = (Date.now() - start) / 1000;
    this.logger.log(`Company Similarity Matrix updated in ${duration}s.`);
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    let cursor = '0';
    const keys: string[] = [];
    do {
      const res = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 1000);
      cursor = res[0];
      keys.push(...res[1]);
    } while (cursor !== '0');
    return keys;
  }


  private async computeAndStoreCompanySimilarity(targetCid: string) {
    // A. 取得目標公司看過的學生 (Set A)
    const targetStudents = await this.redis.zrange(
      `company:${targetCid}:student:clicks`,
      0,
      -1,
    );
    if (targetStudents.length === 0) return;

    const targetSet = new Set(targetStudents);
    const candidates = new Set<string>();

    // B. 找出 "相似候選公司" (只找看過相同學生的公司)
    // 優化：只取最近看過的 50 位學生來找鄰居
    const recentStudents = targetStudents.slice(-50);

    for (const sid of recentStudents) {
      // 誰也看過這個學生？
      // key: student:{sid}:viewed_by_company
      const viewers = await this.redis.zrange(
        `student:${sid}:viewed_by_company`,
        0,
        -1,
      );
      for (const otherCid of viewers) {
        if (otherCid !== targetCid) {
          candidates.add(otherCid);
        }
      }
    }

    const candidateArray = Array.from(candidates);
    const scores: { cid: string; score: number }[] = [];

    // C. 計算 Jaccard Similarity (Pipeline 加速讀取)
    const pipeline = this.redis.pipeline();
    for (const otherCid of candidateArray) {
      pipeline.zrange(`company:${otherCid}:student:clicks`, 0, -1);
    }

    const results = await pipeline.exec();

    results?.forEach((result, index) => {
      const [err, otherStudents] = result as [Error | null, string[]];
      if (err || !otherStudents) return;

      const otherCid = candidateArray[index];
      const otherSet = new Set(otherStudents);

      // 計算交集
      let intersection = 0;
      if (targetSet.size < otherSet.size) {
        for (const s of targetSet) if (otherSet.has(s)) intersection++;
      } else {
        for (const s of otherSet) if (targetSet.has(s)) intersection++;
      }

      const union = targetSet.size + otherSet.size - intersection;

      if (union > 0) {
        const score = intersection / union;
        if (score > 0.1) {
          // 門檻值
          scores.push({ cid: otherCid, score });
        }
      }
    });

    // D. 排序並存回 Redis (只留前 10 名相似公司)
    scores.sort((a, b) => b.score - a.score);
    const top10 = scores.slice(0, 10);

    if (top10.length > 0) {
      const savePipeline = this.redis.pipeline();
      const key = `company:${targetCid}:similar`;

      savePipeline.del(key);
      for (const item of top10) {
        savePipeline.zadd(key, item.score, item.cid);
      }
      savePipeline.expire(key, 60 * 60 * 25);
      await savePipeline.exec();
    }
  }

  // ==========================================================
  // 每日 00:35 更新過期的申請狀態 (PostgreSQL)
  // ==========================================================
  @Cron('35 0 * * *') // 00:35 AM daily
  async updateExpiredApplications() {
    this.logger.log('Updating expired applications...');

    const sql = `
UPDATE application a
SET review_status = 'pending'
WHERE a.review_status = 'submitted'
  AND EXISTS (
        SELECT 1
        FROM resource r
        WHERE r.resource_id = a.resource_id
          AND r.deadline < CURRENT_DATE
      );

    `;

    const result = await this.dataSource.query(sql);
    this.logger.log(`Expired applications updated.`);
  }

  // ==========================================================
  // 每日 00:40 更新過期的資源狀態 (PostgreSQL)
  // ==========================================================
  @Cron('40 0 * * *') // 00:40 AM daily
  async updateExpiredResources() {
    this.logger.log('Updating expired resources...');

    const sql = `
      UPDATE resource r
      SET status = 'Unavailable'
      WHERE r.deadline < CURRENT_DATE
        AND r.status = 'Available';
    `;

    await this.dataSource.query(sql);
    this.logger.log('Expired resources updated.');
  }

}
