import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { EventService } from '../enent/event.service';
import { Resource } from '../../entities/resource.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { ResourceCondition } from '../../entities/resource-condition.entity';
import { StudentGpa } from 'src/entities/student-gpa.entity';

@Injectable()
export class PushService {
  constructor(
    private readonly eventService: EventService,

    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,

    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,

    @InjectRepository(StudentProfile)
    private readonly studentRepo: Repository<StudentProfile>,

    // conditionRepo 不需要在此注入，因為我們用 resourceRepo 的 relations 關聯讀取
    
    @InjectRepository(StudentGpa)
    private readonly gpaRepo: Repository<StudentGpa>,
  ) {}

  /**
   * 推薦資源給學生
   */
  async pushResourcesForStudent(uid: string): Promise<{ resource: Resource; score: number }[]> {
    // 1. 取得學生基本資料
    const profile = await this.studentRepo.findOne({ where: { user_id: uid } });
    if (!profile) return [];

    // 2. 預先計算 GPA 數據 (避免在迴圈中重複查詢與計算)
    const gpaStats = await this.getStudentGpaStats(uid);

    // 3. 取得所有資源，並同時關聯載入條件 (解決 N+1 Query 問題)
    const allResources = await this.resourceRepo.find({
      relations: ['conditions'], 
    });

    // 4. 從 Redis 讀取偏好資料 (Batch operations)
    const [typePrefs, viewedResources] = await Promise.all([
      this.getUserTypePreference(uid),
      this.getUserViewedResources(uid),
    ]);

    const results: { resource: Resource; score: number }[] = [];

    // 5. 計算分數迴圈
    for (const r of allResources) {
      // 若資源已被看過，可以選擇是否過濾 (此處保留但可視需求調整)
      // if (viewedResources.includes(r.resource_id)) continue; 

      const matchScore = this.computeMatchScore(r, profile, gpaStats);
      const historyScore = typePrefs[r.resource_type] ?? 0;
      
      // 注意：協同過濾 (SimilarUser) 計算量極大，建議在生產環境改為背景計算或簡化邏輯
      const similarScore = await this.computeSimilarUserScore(uid, r.resource_id);

      const finalScore =
        0.4 * matchScore +
        0.3 * historyScore +
        0.3 * similarScore;

      results.push({ resource: r, score: finalScore });
    }

    // 6. 排序並回傳前 20 筆
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20);
  }

  /**
   * 推薦學生給企業
   */
  async pushStudentsForCompany(companyId: string): Promise<{ student: StudentProfile; score: number }[]> {
    const students = await this.studentRepo.find();
    const results: { student: StudentProfile; score: number }[] = [];

    // 預先抓取所有全域瀏覽數，避免迴圈內 await
    const maxGlobalViews = await this.getMaxGlobalViews();

    for (const s of students) {
      const scoreProfile = this.computeStudentMatchScore(companyId, s);
      const scorePopularity = await this.computeStudentPopularityScore(s.user_id, maxGlobalViews);
      const scoreSimilar = await this.computeSimilarCompanyScore(companyId, s.user_id);

      const final =
        0.4 * scoreProfile +
        0.3 * scorePopularity +
        0.3 * scoreSimilar;

      results.push({ student: s, score: final });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 20);
  }

  // ==========================================================
  // Private Helpers: Data Fetching & Pre-processing
  // ==========================================================

  private async getStudentGpaStats(uid: string): Promise<{ avg: number; current: number } | null> {
    const gpaList = await this.gpaRepo.find({ where: { user_id: uid } });
    if (!gpaList || gpaList.length === 0) return null;

    const avg = gpaList.reduce((sum, r) => sum + (r.gpa ?? 0), 0) / gpaList.length;
    // 排序找出最新學期
    const latest = gpaList.sort((a, b) => (b.semester > a.semester ? 1 : -1))[0];
    
    return {
      avg,
      current: latest.gpa ?? 0,
    };
  }

  private async getUserTypePreference(uid: string): Promise<Record<string, number>> {
    const raw = await this.redis.zrevrange(`user:${uid}:type:clicks`, 0, -1, 'WITHSCORES');
    const prefs: Record<string, number> = {};
    let max = 0;

    for (let i = 0; i < raw.length; i += 2) {
      const type = raw[i];
      const score = Number(raw[i + 1]);
      prefs[type] = score;
      if (score > max) max = score;
    }

    if (max > 0) {
      for (const k in prefs) prefs[k] /= max;
    }
    return prefs;
  }

  private async getUserViewedResources(uid: string): Promise<string[]> {
    return this.redis.zrevrange(`user:${uid}:resource:clicks`, 0, -1);
  }

  private async getResourceViewers(rid: string): Promise<string[]> {
    return this.redis.zrevrange(`resource:${rid}:viewed_by`, 0, -1);
  }

  private async getMaxGlobalViews(): Promise<number> {
     const top = await this.redis.zrevrange('student:global:views', 0, 0, 'WITHSCORES');
     return Number(top[1]) || 1;
  }

  // ==========================================================
  // Pure Logic: Score Computation (No DB Calls)
  // ==========================================================

  private computeMatchScore(
    resource: Resource,
    profile: StudentProfile,
    gpaStats: { avg: number; current: number } | null
  ): number {
    // 資源的條件已經透過 relations 載入，不需要再查詢
    const conditions = resource.conditions || [];

    if (conditions.length === 0) {
      return this.applyCompetitionWeight(1, resource);
    }

    let bestScore = 0;
    for (const cond of conditions) {
      const score = this.evaluateCondition(cond, profile, gpaStats);
      if (score > bestScore) bestScore = score;
    }

    return this.applyCompetitionWeight(bestScore, resource);
  }

  private evaluateCondition(
    cond: ResourceCondition,
    profile: StudentProfile,
    gpaStats: { avg: number; current: number } | null
  ): number {
    // 判斷基本條件
    const deptOK = !cond.department_id || cond.department_id === profile.department_id;
    const poorOK = cond.is_poor == null || cond.is_poor === profile.is_poor;
    
    // 判斷成績條件 (如果沒有成績紀錄，但條件要求成績，則不符合)
    let avgOK = true;
    let currentOK = true;

    if (cond.avg_gpa) {
        avgOK = gpaStats ? gpaStats.avg >= cond.avg_gpa : false;
    }
    if (cond.current_gpa) {
        currentOK = gpaStats ? gpaStats.current >= cond.current_gpa : false;
    }

    return (deptOK && avgOK && currentOK && poorOK) ? 1 : 0;
  }

  private applyCompetitionWeight(matchScore: number, resource: Resource): number {
    const quota = resource.quota ?? 0;
    // Normalize quota to score (assuming 20 is a "good" amount)
    const competitionScore = Math.min(1, quota / 20);
    return 0.7 * matchScore + 0.3 * competitionScore;
  }

  // ==========================================================
  // Complex Calculations (Redis Dependent)
  // ==========================================================

  private async computeSimilarUserScore(uid: string, rid: string): Promise<number> {
    // 效能警告：此方法在 N 個資源迴圈中呼叫會非常慢。
    // 建議改為：只計算 Top N 匹配資源的相似度，或是使用 Redis Set 交集指令 (SINTER) 優化。
    
    // 這裡保留原本邏輯，但修復變數宣告
    const viewed = await this.getUserViewedResources(uid);
    // 若用戶沒看過任何東西，無法計算相似度
    if (viewed.length === 0) return 0;

    const coMap = new Map<string, number>();

    // 優化：限制只看最近看過的 5 個資源，避免爆炸
    const recentViewed = viewed.slice(0, 5);

    for (const v of recentViewed) {
      const others = await this.getResourceViewers(v);
      // 限制比對人數
      const sampleOthers = others.slice(0, 20); 

      for (const other of sampleOthers) {
        if (other === uid) continue;
        const otherViewed = await this.getUserViewedResources(other);
        if (otherViewed.includes(rid)) {
          coMap.set(rid, (coMap.get(rid) ?? 0) + 1);
        }
      }
    }

    const max = Math.max(...coMap.values(), 1);
    return (coMap.get(rid) ?? 0) / max;
  }

  private computeStudentMatchScore(companyId: string, s: StudentProfile): number {
    return 1;
  }

  private async computeStudentPopularityScore(studentId: string, maxScore: number): Promise<number> {
    const score = await this.redis.zscore('student:global:views', studentId);
    if (!score) return 0;
    return Number(score) / maxScore;
  }

  private async computeSimilarCompanyScore(companyId: string, studentId: string): Promise<number> {
    return 0;
  }
}