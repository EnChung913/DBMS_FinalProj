<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

// 定義資料型別 (TypeScript)
interface Skill {
  name: string;
  level: number; // 0-100
}

interface Opportunity {
  id: string;
  title: string;
  company: string;
  type: 'Internship' | 'Course' | 'Competition';
  tags: string[];
  matchScore: number; // 媒合分數
}

// 模擬資料 (之後透過 API 從後端取得)
const studentName = ref('王小明');
const department = ref('資訊工程學系');
const stats = ref({
  gpa: 3.8,
  credits: 84,
  ranking: 'Top 10%'
});

const skills = ref<Skill[]>([
  { name: 'Vue.js / 前端開發', level: 85 },
  { name: 'Python / 資料分析', level: 70 },
  { name: 'UI/UX 設計', level: 60 },
  { name: '專案管理', level: 50 },
]);

const opportunities = ref<Opportunity[]>([
  {
    id: '1',
    title: '前端工程實習生',
    company: 'UniTech 創新科技',
    type: 'Internship',
    tags: ['Vue.js', 'Remote'],
    matchScore: 95
  },
  {
    id: '2',
    title: '2025 全國大專校院程式設計競賽',
    company: '教育部',
    type: 'Competition',
    tags: ['Algorithm', 'Team'],
    matchScore: 88
  },
  {
    id: '3',
    title: '資料科學入門工作坊',
    company: 'DataCamp Taiwan',
    type: 'Course',
    tags: ['Python', 'Beginner'],
    matchScore: 75
  }
]);

// 根據標籤類型回傳不同的莫蘭迪色 class
const getTagClass = (type: string) => {
  if (type === 'Internship') return 'tag-blue';
  if (type === 'Competition') return 'tag-red';
  return 'tag-green';
};
</script>

<template>
  <div class="dashboard-container">
    
    <section class="hero-section">
      <div class="welcome-text">
        <h1>早安，{{ studentName }} ☀️</h1>
        <p>{{ department }} | 大學三年級</p>
      </div>
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-label">目前 GPA</span>
          <span class="stat-value">{{ stats.gpa }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">已修學分</span>
          <span class="stat-value">{{ stats.credits }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">系排預測</span>
          <span class="stat-value highlight">{{ stats.ranking }}</span>
        </div>
      </div>
    </section>

    <div class="main-grid">
      <section class="feed-section">
        <div class="section-header">
          <h3>為您推薦的機會</h3>
          <button class="btn-text">查看更多 &rarr;</button>
        </div>

        <div class="cards-list">
          <div v-for="item in opportunities" :key="item.id" class="opportunity-card">
            <div class="card-top">
              <span class="match-badge">{{ item.matchScore }}% 媒合</span>
              <span :class="['type-tag', getTagClass(item.type)]">{{ item.type }}</span>
            </div>
            <h4>{{ item.title }}</h4>
            <p class="company-name"><i class="icon">🏢</i> {{ item.company }}</p>
            <div class="tags-row">
              <span v-for="tag in item.tags" :key="tag" class="tech-tag">#{{ tag }}</span>
            </div>
            <button class="btn-apply">查看詳情</button>
          </div>
        </div>
      </section>

      <aside class="sidebar-section">
        
        <div class="info-card">
          <h3>能力雷達圖</h3>
          <div class="skills-list">
            <div v-for="skill in skills" :key="skill.name" class="skill-item">
              <div class="skill-info">
                <span>{{ skill.name }}</span>
                <span>{{ skill.level }}%</span>
              </div>
              <div class="progress-bg">
                <div class="progress-bar" :style="{ width: skill.level + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card quick-actions">
          <h3>快速功能</h3>
          <button class="action-btn">📄 更新履歷 (CV)</button>
          <button class="action-btn">🎓 查看歷年成績單</button>
          <button class="action-btn">❤️ 收藏的職缺</button>
        </div>

      </aside>
    </div>
  </div>
</template>

<style scoped>
/* 變數繼承自 main.css，這裡做局部微調 */
.dashboard-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  /* 配合 App.vue 的 padding-top: 140px，這裡不需要額外加太多 */
}

/* --- Hero Section --- */
.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 20px;
}

.welcome-text h1 {
  font-size: 2rem;
  color: var(--accent-color);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.welcome-text p {
  color: var(--secondary-color);
  margin: 0;
}

.stats-row {
  display: flex;
  gap: 1.5rem;
}

.stat-card {
  background: #fff;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  min-width: 100px;
  text-align: center;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--secondary-color);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--primary-color);
}
.stat-value.highlight {
  color: #D98C8C; /* 莫蘭迪紅 */
}

/* --- Grid Layout --- */
.main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr; /* 左邊佔 2/3，右邊佔 1/3 */
  gap: 2rem;
}

@media (max-width: 768px) {
  .main-grid {
    grid-template-columns: 1fr; /* 手機版變單欄 */
  }
}

/* --- Feed Section (Opportunity Cards) --- */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h3 {
  color: var(--text-color);
  margin: 0;
}

.btn-text {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-size: 0.9rem;
}

.cards-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.opportunity-card {
  background: #fff;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.03);
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid rgba(0,0,0,0.02);
}

.opportunity-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(125, 157, 156, 0.15);
}

.card-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.8rem;
}

.match-badge {
  background-color: #F0F4F4; /* 極淡的綠 */
  color: var(--primary-color);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}

.type-tag {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 20px;
  color: #fff;
}
.tag-blue { background-color: #9FB1BC; }
.tag-red { background-color: #D98C8C; }
.tag-green { background-color: #7D9D9C; }

.opportunity-card h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: var(--text-color);
}

.company-name {
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.tags-row {
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
}

.tech-tag {
  background: #F7F5F2;
  color: var(--accent-color);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.btn-apply {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--primary-color);
  background: transparent;
  color: var(--primary-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-apply:hover {
  background: var(--primary-color);
  color: #fff;
}

/* --- Sidebar (Info Cards) --- */
.info-card {
  background: #fff;
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  margin-bottom: 1.5rem;
}

.info-card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.1rem;
  color: var(--accent-color);
}

/* Progress Bar Style */
.skill-item {
  margin-bottom: 1rem;
}
.skill-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 4px;
  color: var(--text-color);
}
.progress-bg {
  width: 100%;
  height: 8px;
  background-color: #EBEBE8;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background-color: var(--primary-color); /* 莫蘭迪主色 */
  border-radius: 4px;
  transition: width 1s ease-in-out;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  text-align: left;
  padding: 12px;
  border: none;
  background-color: #F7F5F2;
  color: var(--text-color);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.9rem;
}

.action-btn:hover {
  background-color: #E4E4E1;
}
</style>