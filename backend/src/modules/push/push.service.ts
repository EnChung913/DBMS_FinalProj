import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { EventService } from '../event/event.service';
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

    @InjectRepository(StudentGpa)
    private readonly gpaRepo: Repository<StudentGpa>,
  ) {}

  // ==========================================================
  // 1. 推薦資源給學生
  // ==========================================================
  private isEligibleForResource(
    resource: Resource,
    profile: StudentProfile,
    gpaStats: { avg: number; current: number } | null
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

  async pushResourcesForStudent(uid: string): Promise<{ resource: Resource; score: number }[]> {
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
      const matchScore = this.computeMatchScore(r, profile, gpaStats);
      const historyScore = typePrefs[r.resource_type] ?? 0;
      const similarScore = await this.computeSimilarUserScore(uid, r.resource_id, viewedResources);

      const finalScore =
        0.4 * matchScore +
        0.3 * historyScore +
        0.3 * similarScore;

      results.push({ resource: r, score: finalScore });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  // ==========================================================
  // 2. 推薦學生給企業（統一版本）
  // ==========================================================
  async pushStudentsForCompany(companyId: string): Promise<{ student: StudentProfile; score: number }[]> {
    // 1. 全部學生 + 該公司所有資源
    const [students, companyResources, maxGlobalViews, gpaMap] = await Promise.all([
      this.studentRepo.find(),
      this.resourceRepo.find({
        where: { company_supplier_id: companyId },
        relations: ['conditions'],
      }),
      this.getMaxGlobalViews(),
      this.getAllStudentGpaStats(),
    ]);

    if (students.length === 0 || companyResources.length === 0) return [];

    // 2. 先算「原始分數」，再做標準化
    const tmp: {
      student: StudentProfile;
      rawMatch: number;
      rawPopularity: number;
      rawSimilar: number;
    }[] = [];

    for (const s of students) {
      const gpaStats = gpaMap.get(s.user_id) ?? null;

      // a. 這個學生跟公司資源的「條件匹配程度」（0~1）
      const rawMatch = this.computeStudentMatchScore(companyResources, s, gpaStats);

      // b. 這個學生整體被「看過的次數」→ 代表市場熱門程度
      const rawPopularity = await this.computeStudentPopularityScore(s.user_id, maxGlobalViews);

      // c. 協同過濾：跟這家公司「品味類似」的公司是否也看過這個學生
      const rawSimilar = await this.computeSimilarCompanyScore(companyId, s.user_id);

      tmp.push({ student: s, rawMatch, rawPopularity, rawSimilar });
    }

    // 3. 各 component 做「總和為 1」的標準化
    const sumMatch = tmp.reduce((acc, x) => acc + x.rawMatch, 0);
    const sumPopularity = tmp.reduce((acc, x) => acc + x.rawPopularity, 0);
    const sumSimilar = tmp.reduce((acc, x) => acc + x.rawSimilar, 0);

    const n = students.length;
    const results = tmp.map(item => {
      const matchScore = sumMatch > 0 ? item.rawMatch / sumMatch : 1 / n;
      const popularityScore = sumPopularity > 0 ? item.rawPopularity / sumPopularity : 0;
      const similarScore = sumSimilar > 0 ? item.rawSimilar / sumSimilar : 0;

      const final =
        0.4 * matchScore +
        0.3 * popularityScore +
        0.3 * similarScore;

      return { student: item.student, score: final };
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  // ==========================================================
  // Private Helpers: GPA 相關
  // ==========================================================

  private async getStudentGpaStats(uid: string): Promise<{ avg: number; current: number } | null> {
    const gpaList = await this.gpaRepo.find({ where: { user_id: uid } });
    if (!gpaList || gpaList.length === 0) return null;

    const avg = gpaList.reduce((sum, r) => sum + (r.gpa ?? 0), 0) / gpaList.length;
    const latest = gpaList.sort((a, b) => (b.semester > a.semester ? 1 : -1))[0];

    return {
      avg,
      current: latest.gpa ?? 0,
    };
  }

  // 把所有學生的 GPA 一次拉出來，避免 pushStudentsForCompany 裡面 N+1 query
  private async getAllStudentGpaStats(): Promise<Map<string, { avg: number; current: number }>> {
    const gpaList = await this.gpaRepo.find();
    const tmp = new Map<string, { sum: number; count: number; latestSem: string; latestGpa: number }>();

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

  private async getUserTypePreference(uid: string): Promise<Record<string, number>> {
    // key: user:{uid}:type:clicks (member=resource_type, score=click_count)
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
    return this.redis.zrevrange(`student:${studentId}:viewed_by_company`, 0, -1);
  }

  private async getMaxGlobalViews(): Promise<number> {
    // key: student:global:views (member=student_id, score=view_count)
    const top = await this.redis.zrevrange('student:global:views', 0, 0, 'WITHSCORES');
    return Number(top[1]) || 1;
  }

  // ==========================================================
  // Pure Logic: Score Computation (resource -> student)
  // ==========================================================

  private computeMatchScore(
    resource: Resource,
    profile: StudentProfile,
    gpaStats: { avg: number; current: number } | null
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
    gpaStats: { avg: number; current: number } | null
  ): number {
    const deptOK = !cond.department_id || cond.department_id === profile.department_id;
    const poorOK = cond.is_poor == null || cond.is_poor === profile.is_poor;

    let avgOK = true;
    let currentOK = true;

    if (cond.avg_gpa != null) {
      avgOK = gpaStats ? gpaStats.avg >= cond.avg_gpa : false;
    }
    if (cond.current_gpa != null) {
      currentOK = gpaStats ? gpaStats.current >= cond.current_gpa : false;
    }

    return (deptOK && avgOK && currentOK && poorOK) ? 1 : 0;
  }

  private applyCompetitionWeight(matchScore: number, resource: Resource): number {
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
    gpaStats: { avg: number; current: number } | null
  ): number {
    if (!resources.length || !gpaStats) return 0;

    let matched = 0;

    for (const r of resources) {
      const conditions = r.conditions || [];
      if (!conditions.length) continue;

      let ok = false;

      for (const cond of conditions) {
        // 只考慮「該系所」或通用的條件
        if (cond.department_id && cond.department_id !== s.department_id) continue;

        const deptOK = !cond.department_id || cond.department_id === s.department_id;
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
    viewedResourcesOfTarget: string[],
  ): Promise<number> {
    const viewers = await this.getResourceViewers(rid);
    if (!viewers.length || !viewedResourcesOfTarget.length) return 0;

    const targetSet = new Set(viewedResourcesOfTarget);
    let simSum = 0;
    let cnt = 0;

    for (const otherUid of viewers) {
      if (otherUid === uid) continue;

      const otherViewed = await this.getUserViewedResources(otherUid);
      if (!otherViewed.length) continue;

      const inter = otherViewed.filter(x => targetSet.has(x)).length;
      const union = new Set([...targetSet, ...otherViewed]).size;
      if (!union) continue;

      simSum += inter / union;
      cnt++;

      // 避免太慢，最多看前 5 個
      if (cnt >= 5) break;
    }

    if (!cnt) return 0;
    const score = simSum / cnt;
    return Math.min(1, score);
  }

  // 公司端：熱門學生分數（用 global view 做 0~1 正規化）
  private async computeStudentPopularityScore(studentId: string, maxGlobalViews: number): Promise<number> {
    if (!maxGlobalViews) return 0;
    const raw = await this.redis.zscore('student:global:views', studentId);
    const cnt = raw ? Number(raw) : 0;
    return cnt / maxGlobalViews;
  }

  // 公司端：協同過濾
  // 想法：如果跟我類似的公司也常看這個學生，就加分
  private async computeSimilarCompanyScore(companyId: string, studentId: string): Promise<number> {
    const viewers = await this.getStudentViewers(studentId);
    if (viewers.length <= 1) return 0;

    const thisCompanyStudents = await this.redis.zrevrange(`company:${companyId}:student:clicks`, 0, -1);
    if (!thisCompanyStudents.length) return 0;
    const thisSet = new Set(thisCompanyStudents);

    let simSum = 0;
    let cnt = 0;

    for (const otherCompanyId of viewers) {
      if (otherCompanyId === companyId) continue;

      const otherStudents = await this.redis.zrevrange(`company:${otherCompanyId}:student:clicks`, 0, -1);
      if (!otherStudents.length) continue;

      const inter = otherStudents.filter(x => thisSet.has(x)).length;
      const union = new Set([...thisCompanyStudents, ...otherStudents]).size;
      if (!union) continue;

      simSum += inter / union;
      cnt++;
      if (cnt >= 5) break;
    }

    if (!cnt) return 0;
    const score = simSum / cnt;
    return Math.min(1, score);
  }
}
