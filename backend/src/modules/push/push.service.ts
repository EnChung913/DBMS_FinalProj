import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { Repository, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { EventService } from '../event/event.service';
import { Resource } from '../../entities/resource.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { ResourceCondition } from '../../entities/resource-condition.entity';
import { StudentGpa } from 'src/entities/student-gpa.entity';

export interface RecommendedStudentResult {
  student: StudentProfile; // 完整的 Profile 結構 (或是 partial)
  score: number;           // 推薦分數
  user_id: string;         // 方便前端存取
  real_name: string;       // 來自 User 表
  gpa: number | null;      // 來自 GPA 統計
  department_id: string;   // 來自 Profile
}

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

    @InjectRepository(StudentGpa)
    private readonly gpaRepo: Repository<StudentGpa>,
  ) {}

  // ==========================================================
  // 1. 推薦資源給學生
  // ==========================================================
  private isEligibleForResource(
    resource: Resource,
    profile: StudentProfile,
    gpaStats: { avg: number; current: number } | null,
  ): boolean {
    const conditions = resource.conditions || [];

    // 沒有條件 => 視為所有人都可以申請
    if (!conditions.length) return true;

    // 只要有一條 condition 通過，就算符合
    for (const cond of conditions) {
      if (this.evaluateCondition(cond, profile, gpaStats)) {
        return true;
      }
    }
    return false;
  }

  async pushResourcesForStudent(
    uid: string,
  ): Promise<{ resource: Resource; score: number }[]> {
    // 1. 取得學生基本資料
    const profile = await this.studentRepo.findOne({ where: { user_id: uid } });
    if (!profile) return [];

    // 2. GPA 統計
    const gpaStats = await this.getStudentGpaStats(uid);

    // 3. 取得所有資源 + 條件 (避免 N+1)
    const allResources = await this.resourceRepo.find({
      relations: ['conditions'],
    });

    // 4. Redis 偏好資料（一次取）
    const [typePrefs, viewedResources] = await Promise.all([
      this.getUserTypePreference(uid),
      this.getUserViewedResources(uid),
    ]);

    const results: { resource: Resource; score: number }[] = [];

    // 5. 計算每個資源的分數
    for (const r of allResources) {
      if (r.status === 'unavailable') {
        continue;
      }
      const matchScore = this.computeMatchScore(r, profile, gpaStats);
      const historyScore = typePrefs[r.resource_type] ?? 0;
      const similarScore = await this.computeSimilarUserScore(
        uid,
        r.resource_id,
        viewedResources,
      );

      const finalScore =
        0.4 * matchScore + 0.3 * historyScore + 0.3 * similarScore;

      results.push({ resource: r, score: finalScore });
    }

    results.sort((a, b) => b.score - a.score);
    console.log('Top recommended resources for user', uid, ':', results.slice(0, 5));
    return results.slice(0, 5);
  }

  // ==========================================================
  // 2. 推薦學生給企業（新增意向分數邏輯）
  // ==========================================================
  async pushStudentsForCompany(
    companyId: string,
  ): Promise<RecommendedStudentResult[]> {
    // ---------------------------------------------------------
    // Phase 1: 數據準備 (只撈取計算所需的最小數據集)
    // ---------------------------------------------------------
    const [students, companyResources, maxGlobalViews, gpaMap] =
      await Promise.all([
        // 1. 只查 ID 與 Dept，避免將大物件 (如 Blob/Text) 載入記憶體
        this.studentRepo.find({
          select: ['user_id', 'department_id', 'student_id'],
        }),
        // 2. 該公司的資源 (含條件)
        this.resourceRepo.find({
          where: { company_supplier_id: companyId },
          relations: ['conditions'],
        }),
        // 3. 全局最高瀏覽數 (用於標準化)
        this.getMaxGlobalViews(),
        // 4. 所有學生的 GPA Map (Map<userId, Stats>)
        this.getAllStudentGpaStats(),
      ]);

    // 邊界檢查
    if (students.length === 0 || companyResources.length === 0) {
      return [];
    }

    // 建立 Set 加速資源 ID 查找
    const companyResourceIds = new Set(
      companyResources.map((r) => r.resource_id),
    );

    // ---------------------------------------------------------
    // Phase 2: 計算分數 (In-Memory Calculation)
    // ---------------------------------------------------------
    
    // 暫存陣列，只存 ID、分數與計算中間值
    const scoredCandidates: {
      userId: string;
      studentPartial: StudentProfile; // 存剛剛撈到的輕量物件
      gpaValue: number | null;
      score: number;
    }[] = [];

    // 預先計算需要的最大值 (若有動態標準化需求，需先跑一次迴圈或估算，這裡採單次迴圈後處理)
    // *註：為效能考量，這裡假設單次迴圈直接算分，若需要 Normalize 依賴全體最大值，
    // 通常改用固定常數或是兩次迴圈。以下維持你的邏輯架構。

    for (const s of students) {
      const gpaStats = gpaMap.get(s.user_id) ?? null;
      const currentGpa = gpaStats ? gpaStats.avg : null;

      // a. 條件匹配
      const rawMatch = this.computeStudentMatchScore(
        companyResources,
        s,
        gpaStats,
      );

      // b. 市場熱門度
      const rawPopularity = await this.computeStudentPopularityScore(
        s.user_id,
        maxGlobalViews,
      );

      // c. 相似企業
      const rawSimilar = await this.computeSimilarCompanyScore(
        companyId,
        s.user_id,
      );

      // d. 學生意向 (假設回傳 0~1 或整數)
      const rawInterest = await this.computeStudentInterestScore(
        s.user_id,
        companyResourceIds,
      );

      // --- 加權總分計算 ---
      // 假設 rawInterest 最大值未知，若要精準 normalize 需二次迴圈。
      // 這裡採用簡單加權 (假設各 raw 分數都在合理區間 0~1)
      const finalScore =
        0.3 * rawMatch +
        0.3 * rawInterest + 
        0.2 * rawPopularity +
        0.2 * rawSimilar;

      scoredCandidates.push({
        userId: s.user_id,
        studentPartial: s,
        gpaValue: currentGpa,
        score: finalScore,
      });
    }

    // ---------------------------------------------------------
    // Phase 3: 排序與切片 (Ranking & Slicing)
    // ---------------------------------------------------------
    
    // 分數高到低排序
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 取前 5 名
    const top5 = scoredCandidates.slice(0, 5);

    if (top5.length === 0) return [];

    // ---------------------------------------------------------
    // Phase 4: Raw SQL 資料填充 (Enrichment)
    // ---------------------------------------------------------
    
  const targetIds = top5.map((c) => c.userId);

  const rawDetails = await this.studentRepo.query(
    `
    SELECT 
      s.user_id,
      s.student_id,
      s.department_id,
      s.grade,
      u.real_name,
      u.email
    FROM student_profile s
    JOIN "user" u ON s.user_id = u.user_id
    WHERE s.user_id = ANY($1)      -- 這裡改
    `,
    [targetIds]                     // 整個 array 放進一個參數
  );

    // 轉成 Map 方便查找
    const detailMap = new Map<string, any>();
    rawDetails.forEach((row: any) => {
        detailMap.set(row.user_id, row);
    });

    // ---------------------------------------------------------
    // Phase 5: 組裝最終結果
    // ---------------------------------------------------------
    
    const results: RecommendedStudentResult[] = top5.map((item) => {
      const detail = detailMap.get(item.userId);

      // 若 DB 資料一致性有問題 (查無此人)，可回傳 null 之後 filter 掉
      if (!detail) return null;

      // 重組 StudentProfile 物件 (如果前端需要它是個物件)
      // 這裡利用 Object.assign 或手動指派將 Raw Data 塞回物件結構
      const enrichedStudent = {
        ...item.studentPartial, // 原本有的 id, dept
        ...detail,              // 補上 SQL 查到的欄位
        user: {                 // 手動建構 user 關聯結構 (模擬 TypeORM relation)
            real_name: detail.real_name,
            email: detail.email
        }
      };

      return {
        student: enrichedStudent,
        score: item.score,
        user_id: item.userId,
        real_name: detail.real_name ?? 'Unknown', // 從 Join 結果拿
        gpa: item.gpaValue,                       // 從計算階段拿 (已在記憶體中)
        department_id: item.studentPartial.department_id,
      };
    }).filter((item): item is RecommendedStudentResult => item !== null);

    // Log 結果 (開發用)
    console.log(
      `[Recommendation] Top 5 for Company ${companyId}:`, 
      results.map(r => `${r.real_name}(${r.score.toFixed(2)})`)
    );

    return results;
  }
  // ==========================================================
  // [新增] Helper: 計算意向分數
  // ==========================================================
  private async computeStudentInterestScore(
    uid: string,
    companyResourceIds: Set<string>,
  ): Promise<number> {
    let score = 0;

    // 1. 檢查瀏覽紀錄 (Redis)
    // 取得該學生看過的所有資源 ID
    const viewedResources = await this.getUserViewedResources(uid);

    // 計算交集：學生看過的資源 是否包含 該公司的資源
    let viewCount = 0;
    for (const rid of viewedResources) {
      if (companyResourceIds.has(rid)) {
        viewCount++;
      }
    }

    // 評分邏輯：看過 1 個就給分，看越多越高，上限 0.5 分
    if (viewCount > 0) {
      score += Math.min(0.5, 0.1 * viewCount + 0.2);
    }

    // 2. 檢查申請紀錄 (Database)
    // *假設有一個 applicationRepo，這邊模擬邏輯
    // const applications = await this.applicationRepo.count({
    //   where: { user_id: uid, resource_id: In([...companyResourceIds]) }
    // });

    // 模擬：假設我們要呼叫 DB 或 Service 確認申請狀態
    // 這裡先設為 0，實作時請替換為真實查詢
    const applicationCount = 0;

    // 申請過的權重極高，直接 +1.0 (這會讓此項分數爆表，成為強推薦)
    if (applicationCount > 0) {
      score += 0.12;
    }

    return score;
  }

  // ==========================================================
  // Private Helpers: GPA 相關
  // ==========================================================

  private async getStudentGpaStats(
    uid: string,
  ): Promise<{ avg: number; current: number } | null> {
    const gpaList = await this.gpaRepo.find({ where: { user_id: uid } });
    if (!gpaList || gpaList.length === 0) return null;

    const avg =
      gpaList.reduce((sum, r) => sum + (r.gpa ?? 0), 0) / gpaList.length;
    const latest = gpaList.sort((a, b) =>
      b.semester > a.semester ? 1 : -1,
    )[0];

    return {
      avg,
      current: latest.gpa ?? 0,
    };
  }

  // 把所有學生的 GPA 一次拉出來，避免 pushStudentsForCompany 裡面 N+1 query
  private async getAllStudentGpaStats(): Promise<
    Map<string, { avg: number; current: number }>
  > {
    const gpaList = await this.gpaRepo.find();
    const tmp = new Map<
      string,
      { sum: number; count: number; latestSem: string; latestGpa: number }
    >();

    for (const row of gpaList) {
      const uid = row.user_id;
      const rec = tmp.get(uid) ?? {
        sum: 0,
        count: 0,
        latestSem: '',
        latestGpa: 0,
      };
      rec.sum += row.gpa ?? 0;
      rec.count += 1;
      if (!rec.latestSem || row.semester > rec.latestSem) {
        rec.latestSem = row.semester;
        rec.latestGpa = row.gpa ?? 0;
      }
      tmp.set(uid, rec);
    }

    const result = new Map<string, { avg: number; current: number }>();
    for (const [uid, r] of tmp.entries()) {
      result.set(uid, {
        avg: r.count > 0 ? r.sum / r.count : 0,
        current: r.latestGpa,
      });
    }
    return result;
  }

  // ==========================================================
  // Private Helpers: Redis 資料讀取
  // ==========================================================

  private async getUserTypePreference(
    uid: string,
  ): Promise<Record<string, number>> {
    // key: user:{uid}:type:clicks (member=resource_type, score=click_count)
    const raw = await this.redis.zrevrange(
      `user:${uid}:type:clicks`,
      0,
      -1,
      'WITHSCORES',
    );
    const prefs: Record<string, number> = {};
    let max = 0;

    for (let i = 0; i < raw.length; i += 2) {
      const type = raw[i];
      const score = Number(raw[i + 1]);
      prefs[type] = score;
      if (score > max) max = score;
    }

    if (max > 0) {
      for (const k in prefs) prefs[k] /= max; // normalize to 0~1
    }
    return prefs;
  }

  private async getUserViewedResources(uid: string): Promise<string[]> {
    // key: user:{uid}:resource:clicks (member=resource_id, score=click_count)
    return this.redis.zrevrange(`user:${uid}:resource:clicks`, 0, -1);
  }

  private async getResourceViewers(rid: string): Promise<string[]> {
    // key: resource:{rid}:viewed_by (member=user_id, score=click_count)
    return this.redis.zrevrange(`resource:${rid}:viewed_by`, 0, -1);
  }

  private async getStudentViewers(studentId: string): Promise<string[]> {
    // key: student:{sid}:viewed_by_company (member=company_id, score=click_count)
    return this.redis.zrevrange(
      `student:${studentId}:viewed_by_company`,
      0,
      -1,
    );
  }

  private async getMaxGlobalViews(): Promise<number> {
    // key: student:global:views (member=student_id, score=view_count)
    const top = await this.redis.zrevrange(
      'student:global:views',
      0,
      0,
      'WITHSCORES',
    );
    return Number(top[1]) || 1;
  }

  // ==========================================================
  // Pure Logic: Score Computation (resource -> student)
  // ==========================================================

  private computeMatchScore(
    resource: Resource,
    profile: StudentProfile,
    gpaStats: { avg: number; current: number } | null,
  ): number {
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
    gpaStats: { avg: number; current: number } | null,
  ): number {
    const deptOK =
      !cond.department_id || cond.department_id === profile.department_id;
    const poorOK = cond.is_poor == null || cond.is_poor === profile.is_poor;

    let avgOK = true;
    let currentOK = true;

    if (cond.avg_gpa != null) {
      avgOK = gpaStats ? gpaStats.avg >= cond.avg_gpa : false;
    }
    if (cond.current_gpa != null) {
      currentOK = gpaStats ? gpaStats.current >= cond.current_gpa : false;
    }

    return deptOK && avgOK && currentOK && poorOK ? 1 : 0;
  }

  private applyCompetitionWeight(
    matchScore: number,
    resource: Resource,
  ): number {
    const quota = resource.quota ?? 0;
    // 假設 quota=20 算是「競爭尚可」的基準
    const competitionScore = Math.min(1, quota / 20);
    return 0.7 * matchScore + 0.3 * competitionScore;
  }

  // ==========================================================
  // Pure Logic: Score Computation (student -> company)
  // ==========================================================

  /**
   * 給定一家公司所有資源 & 一個學生，算出這個學生「符合多少資源」。
   * 回傳值介於 0~1：符合比例 = 符合的資源數 / 總資源數。
   */
  private computeStudentMatchScore(
    resources: Resource[],
    s: StudentProfile,
    gpaStats: { avg: number; current: number } | null,
  ): number {
    if (!resources.length || !gpaStats) return 0;

    let matched = 0;

    for (const r of resources) {
      const conditions = r.conditions || [];
      if (!conditions.length) continue;

      let ok = false;

      for (const cond of conditions) {
        // 只考慮「該系所」或通用的條件
        if (cond.department_id && cond.department_id !== s.department_id)
          continue;

        const deptOK =
          !cond.department_id || cond.department_id === s.department_id;
        const poorOK = cond.is_poor == null || cond.is_poor === s.is_poor;

        let avgOK = true;
        let currentOK = true;

        if (cond.avg_gpa != null) {
          avgOK = gpaStats.avg >= cond.avg_gpa;
        }
        if (cond.current_gpa != null) {
          currentOK = gpaStats.current >= cond.current_gpa;
        }

        if (deptOK && poorOK && avgOK && currentOK) {
          ok = true;
          break;
        }
      }

      if (ok) matched++;
    }

    return matched / resources.length;
  }

  // ==========================================================
  // 協同過濾 / 熱門度
  // ==========================================================

  // 學生端：找「看過同一資源的人」，看他們跟我喜歡的資源有多重疊
  private async computeSimilarUserScore(
    uid: string,
    rid: string,
    viewedResourcesOfTarget: string[], // 這個參數可能不需要了，或者保留做即時 fallback
  ): Promise<number> {
    // 1. 直接從預先算好的矩陣拿 "相似鄰居"
    // member: user_id, score: similarity
    // 拿前 5 名相似用戶
    const similarUsersWithScores = await this.redis.zrevrange(
      `user:${uid}:similar`,
      0,
      4,
      'WITHSCORES',
    );

    if (!similarUsersWithScores.length) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    // 2. 檢查這些鄰居是否看過目前的資源 (rid)
    for (let i = 0; i < similarUsersWithScores.length; i += 2) {
      const neighborId = similarUsersWithScores[i];
      const similarity = Number(similarUsersWithScores[i + 1]);

      // 查詢該鄰居是否看過此資源
      // ZSCORE 回傳分數代表有看過，null 代表沒看過
      const hasViewed = await this.redis.zscore(
        `user:${neighborId}:resource:clicks`,
        rid,
      );

      if (hasViewed) {
        // 如果鄰居看過，加分 (分數由相似度決定)
        weightedSum += similarity * 1;
      }
      totalWeight += similarity;
    }

    if (totalWeight === 0) return 0;

    // 回傳加權後的推薦分數
    return weightedSum / totalWeight;
  }

  // 公司端：熱門學生分數（用 global view 做 0~1 正規化）
  private async computeStudentPopularityScore(
    studentId: string,
    maxGlobalViews: number,
  ): Promise<number> {
    if (!maxGlobalViews) return 0;
    const raw = await this.redis.zscore('student:global:views', studentId);
    const cnt = raw ? Number(raw) : 0;
    return cnt / maxGlobalViews;
  }

  // 公司端：協同過濾
  // 想法：如果跟我類似的公司也常看這個學生，就加分
  private async computeSimilarCompanyScore(
    companyId: string,
    studentId: string,
  ): Promise<number> {
    // 1. 取得跟 "這家公司" 品味很像的 "前 5 家公司"
    // key: company:{cid}:similar (member=other_company_id, score=similarity)
    const similarCompanies = await this.redis.zrevrange(
      `company:${companyId}:similar`,
      0,
      4,
      'WITHSCORES',
    );

    if (!similarCompanies.length) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    // 2. 檢查這些 "品味相似的公司" 是否看過 "這個學生"
    for (let i = 0; i < similarCompanies.length; i += 2) {
      const otherCid = similarCompanies[i];
      const similarity = Number(similarCompanies[i + 1]); // Jaccard Score

      // 檢查 otherCid 是否看過 studentId
      // key: company:{otherCid}:student:clicks
      const hasViewed = await this.redis.zscore(
        `company:${otherCid}:student:clicks`,
        studentId,
      );

      if (hasViewed) {
        // 如果相似公司看過，加分 (分數由相似度加權)
        weightedSum += similarity * 1.0;
      }
      totalWeight += similarity;
    }

    if (totalWeight === 0) return 0;

    // 3. 回傳加權平均分數
    return weightedSum / totalWeight;
  }
}
