import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class DailySchedulerService {
  private readonly logger = new Logger(DailySchedulerService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  // ==========================================================
  // 每日 01:00 重算 Redis 相似度矩陣 (Redis Only)
  // ==========================================================
  @Cron('0 1 * * *')
  async refreshSimilarityMatrixRedis() {
    this.logger.log('Start calculating Similarity Matrix in Redis...');
    const start = Date.now();

    // 1. 取得所有活躍的使用者 (或是遍歷所有 user key)
    // 這裡假設我們用 scan 找出所有 'user:*:resource:clicks' 的 key
    const userKeys = await this.scanKeys('user:*:resource:clicks');
    
    // 解析出 userIds
    const userIds = userKeys.map(key => key.split(':')[1]);
    
    this.logger.log(`Found ${userIds.length} users to process.`);

    // 2. 逐一計算每個 User 的相似鄰居
    // 注意：如果用戶量很大 (萬級以上)，建議用 queue 分批處理，避免阻塞 event loop 太久
    for (const targetUid of userIds) {
      await this.computeAndStoreSimilarity(targetUid, userIds);
    }

    const duration = (Date.now() - start) / 1000;
    this.logger.log(`Redis Similarity Matrix updated in ${duration}s.`);
  }

  // ==========================================================
  // 核心邏輯：計算單一用戶的相似鄰居
  // ==========================================================
  private async computeAndStoreSimilarity(targetUid: string, allUserIds: string[]) {
    // A. 取得目標用戶看過的資源 (Set A)
    // user:{uid}:resource:clicks 是一個 ZSET，我們取 key (resource_id) 即可
    const targetResources = await this.redis.zrange(`user:${targetUid}:resource:clicks`, 0, -1);
    
    if (targetResources.length === 0) return; // 沒看過任何東西，無法計算

    const targetSet = new Set(targetResources);
    
    // B. 找出 "候選人" (Candidates)
    // 優化：不需要跟全站 10000 人比對，只要跟「看過相同資源」的人比對即可
    // 利用 resource:{rid}:viewed_by (反向索引)
    const candidates = new Set<string>();
    
    // 為了效能，我們只取前 50 個最近看過的資源來找鄰居 (避免舊資料影響太大)
    const recentResources = targetResources.slice(-50); 

    for (const rid of recentResources) {
      // 誰也看過這個資源？
      const viewers = await this.redis.zrange(`resource:${rid}:viewed_by`, 0, -1);
      for (const viewerId of viewers) {
        if (viewerId !== targetUid) {
          candidates.add(viewerId);
        }
      }
    }

    // 如果候選人太多，隨機取樣或取前 100 人計算 (效能取捨)
    // 這裡示範全部計算
    const candidateArray = Array.from(candidates);
    
    const scores: { uid: string; score: number }[] = [];

    // C. 計算 Jaccard Similarity
    // 這裡可以用 Pipeline 加速讀取
    const pipeline = this.redis.pipeline();
    for (const otherUid of candidateArray) {
      pipeline.zrange(`user:${otherUid}:resource:clicks`, 0, -1);
    }
    
    // 批次執行讀取
    const results = await pipeline.exec();

    // 處理結果
    results?.forEach((result, index) => {
      const [err, otherResources] = result as [Error | null, string[]];
      if (err || !otherResources) return;

      const otherUid = candidateArray[index];
      const otherSet = new Set(otherResources);

      // Jaccard 計算: 交集 / 聯集
      let intersection = 0;
      // 遍歷較小的集合以優化速度
      if (targetSet.size < otherSet.size) {
        for (const item of targetSet) if (otherSet.has(item)) intersection++;
      } else {
        for (const item of otherSet) if (targetSet.has(item)) intersection++;
      }

      const union = targetSet.size + otherSet.size - intersection;
      
      if (union > 0) {
        const score = intersection / union;
        // 門檻值：太低的相似度不存 (例如 < 0.1)
        if (score > 0.1) {
          scores.push({ uid: otherUid, score });
        }
      }
    });

    // D. 排序並存回 Redis
    // 只留前 10 名
    scores.sort((a, b) => b.score - a.score); // 降冪
    const top10 = scores.slice(0, 10);

    if (top10.length > 0) {
      const savePipeline = this.redis.pipeline();
      // key: user:{uid}:similar (ZSET)
      // 先清空舊的 (或是直接覆蓋，ZADD 會更新 score)
      // 這裡選擇刪除舊 key 重新建立，確保不會留存過期的「前朋友」
      savePipeline.del(`user:${targetUid}:similar`);
      
      for (const item of top10) {
        // ZADD key score member
        savePipeline.zadd(`user:${targetUid}:similar`, item.score, item.uid);
      }
      
      // 設定過期時間 (例如 25 小時，確保 Cron 失敗時資料不會太舊但也不會永久留存)
      savePipeline.expire(`user:${targetUid}:similar`, 60 * 60 * 25);
      
      await savePipeline.exec();
    }
  }

  // Helper: 掃描所有 Key (若 key 很多建議用這種 iterator 方式)
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
  

  // ==========================================================
  // 每日 01:15 重算 公司相似度矩陣 (Company-Company Similarity)
  // ==========================================================
  @Cron('15 1 * * *')
  async refreshCompanySimilarityMatrix() {
    this.logger.log('Start calculating Company Similarity Matrix...');
    const start = Date.now();

    // 1. 取得所有有活躍紀錄的公司
    // 假設 key pattern 是 company:{cid}:student:clicks
    const companyKeys = await this.scanKeys('company:*:student:clicks');
    const companyIds = companyKeys.map(key => key.split(':')[1]);

    this.logger.log(`Found ${companyIds.length} companies to process.`);

    for (const targetCid of companyIds) {
      await this.computeAndStoreCompanySimilarity(targetCid);
    }

    const duration = (Date.now() - start) / 1000;
    this.logger.log(`Company Similarity Matrix updated in ${duration}s.`);
  }

  private async computeAndStoreCompanySimilarity(targetCid: string) {
    // A. 取得目標公司看過的學生 (Set A)
    const targetStudents = await this.redis.zrange(`company:${targetCid}:student:clicks`, 0, -1);
    if (targetStudents.length === 0) return;

    const targetSet = new Set(targetStudents);
    const candidates = new Set<string>();

    // B. 找出 "相似候選公司" (只找看過相同學生的公司)
    // 優化：只取最近看過的 50 位學生來找鄰居
    const recentStudents = targetStudents.slice(-50);

    for (const sid of recentStudents) {
      // 誰也看過這個學生？
      // key: student:{sid}:viewed_by_company
      const viewers = await this.redis.zrange(`student:${sid}:viewed_by_company`, 0, -1);
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
        if (score > 0.1) { // 門檻值
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
}
