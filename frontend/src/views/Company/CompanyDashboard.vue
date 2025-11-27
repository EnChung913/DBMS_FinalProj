<!-- src/views/company/Dashboard.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/axios';

// 定義資料介面
interface Job {
  id: string;
  title: string;
  type: string;       // e.g. Intern, Full-time
  quota: number;
  applied: number;
  status: 'Open' | 'Closed' | 'Draft';
  publish_date: string;
}

interface Applicant {
  user_id: string;
  name: string;
  job: string;
  gpa: number;
  date: string;
  status: 'submitted' | 'reviewed' | 'interview';
}

const jobs = ref<Job[]>([]);
const applicants = ref<Applicant[]>([]);
const showAnimation = ref(false);

onMounted(async () => {
  setTimeout(() => showAnimation.value = true, 100);

  try {
    // ----------------------------------------------------------------
    // TO DO: 連接後端 API (Company Dashboard)
    // ----------------------------------------------------------------
    
    // 1. [GET] /api/company/jobs
    // jobs.value = (await apiClient.get('/company/jobs')).data;

    // 2. [GET] /api/company/applications
    // applicants.value = (await apiClient.get('/company/applications')).data;

    // --- MOCK DATA ---
    jobs.value = [
      { 
        id: 'c1', title: 'Frontend Engineer Intern (Vue.js)', type: 'Internship',
        quota: 3, applied: 15, status: 'Open', publish_date: '2025-02-10'
      },
      { 
        id: 'c2', title: 'Backend Developer (Node.js)', type: 'Full-time',
        quota: 1, applied: 8, status: 'Open', publish_date: '2025-02-12'
      },
      { 
        id: 'c3', title: 'UI/UX Designer', type: 'Internship',
        quota: 2, applied: 0, status: 'Draft', publish_date: '2025-02-20'
      }
    ];

    applicants.value = [
      { user_id: 'u1', name: 'Alex Chen', job: 'Frontend Engineer Intern', gpa: 3.9, date: '2025-02-22', status: 'submitted' },
      { user_id: 'u2', name: 'Betty Wu', job: 'Frontend Engineer Intern', gpa: 4.1, date: '2025-02-21', status: 'reviewed' },
      { user_id: 'u3', name: 'Charlie Lin', job: 'Backend Developer', gpa: 3.5, date: '2025-02-20', status: 'submitted' }
    ];

  } catch (error) { console.error(error); }
});

const getStatusClass = (status: string) => {
  switch (status) {
    case 'Open': return 'status-green';
    case 'Closed': return 'status-gray';
    default: return 'status-yellow'; // Draft
  }
};
</script>

<template>
  <div class="dashboard-wrapper">
    
    <header class="hero-header">
      <div class="hero-content">
        <div class="header-text">
          <span class="sub-greeting">Recruitment Center</span>
          <h1>企業人才招募管理</h1>
        </div>
        <div class="header-actions">
           <button class="btn-primary-large">
             <span class="icon">＋</span> 發布新職缺
           </button>
        </div>
      </div>
    </header>

    <div class="main-grid">
      
      <section class="left-panel">
        <div class="section-title">
          <h3>職缺概況</h3>
          <span class="badge-count">{{ jobs.length }} Active</span>
        </div>

        <div class="jobs-container">
          <div v-for="job in jobs" :key="job.id" class="job-card">
            
            <div class="card-header">
              <div class="job-meta">
                <span :class="['status-dot', getStatusClass(job.status)]"></span>
                <span class="job-type">{{ job.type }}</span>
              </div>
              <button class="btn-icon-more">⋮</button>
            </div>

            <h3 class="job-title">{{ job.title }}</h3>
            
            <div class="job-stats-row">
              <div class="stat-box">
                <span class="label">需求名額</span>
                <span class="value">{{ job.quota }}</span>
              </div>
              <div class="divider"></div>
              <div class="stat-box">
                <span class="label">投遞人數</span>
                <span class="value highlight">{{ job.applied }}</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="date">發布於: {{ job.publish_date }}</span>
              <button class="btn-outline-sm">管理職缺</button>
            </div>
          </div>
        </div>
      </section>

      <aside class="right-panel">
        <div class="dashboard-card full-height">
          <div class="card-head">
            <h3>最新申請</h3>
            <a href="#" class="link-view-all">查看全部</a>
          </div>

          <ul class="applicant-list">
            <li v-for="app in applicants" :key="app.user_id" class="applicant-item">
              <div class="avatar">{{ app.name.charAt(0) }}</div>
              
              <div class="applicant-info">
                <div class="info-top">
                  <span class="name">{{ app.name }}</span>
                  <span class="gpa-badge">GPA {{ app.gpa }}</span>
                </div>
                <span class="job-target">應徵：{{ app.job }}</span>
                <span class="apply-date">{{ app.date }}</span>
              </div>

              <button class="btn-review">審閱</button>
            </li>
          </ul>
        </div>
      </aside>

    </div>
  </div>
</template>

<style scoped>
/* 繼承全域莫蘭迪變數 src/assets/main.css */

/* --- 佈局容器 --- */
.dashboard-wrapper {
  width: 95%;
  max-width: 1440px;
  margin: 0 auto;
  padding-bottom: 60px;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Hero Header --- */
.hero-header {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #fff 0%, #F7F5F2 100%);
  padding: 30px 40px;
  border-radius: 24px;
  border: 1px solid rgba(0,0,0,0.03);
  box-shadow: 0 10px 30px rgba(0,0,0,0.02);
}

.hero-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-greeting {
  color: var(--secondary-color);
  font-size: 0.9rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 5px;
}

.header-text h1 {
  font-size: 2rem;
  color: var(--accent-color);
  margin: 0;
}

.btn-primary-large {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(125, 157, 156, 0.3);
}

.btn-primary-large:hover {
  background-color: var(--accent-color);
  transform: translateY(-2px);
}

/* --- Main Grid --- */
.main-grid {
  display: grid;
  /* 左邊展示職缺 (卡片流), 右邊展示申請列表 (側邊欄) */
  grid-template-columns: 1fr 380px; 
  gap: 30px;
}

@media (max-width: 1024px) {
  .main-grid { grid-template-columns: 1fr; }
}

/* --- Section Title --- */
.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.section-title h3 { margin: 0; color: var(--text-color); font-size: 1.25rem; }
.badge-count {
  background: #EBEBE8;
  color: var(--secondary-color);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* --- Job Cards Container --- */
.jobs-container {
  display: grid;
  /* 自動適應寬度，最小 300px */
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.job-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(0,0,0,0.02);
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}

.job-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(125, 157, 156, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.job-meta { display: flex; align-items: center; gap: 8px; }
.job-type { font-size: 0.75rem; color: #999; background: #f5f5f5; padding: 2px 8px; border-radius: 4px; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-green { background: #4CAF50; box-shadow: 0 0 0 2px rgba(76,175,80,0.2); }
.status-gray { background: #ccc; }
.status-yellow { background: #FFC107; }

.btn-icon-more {
  background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: #aaa;
}

.job-title {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: var(--text-color);
  line-height: 1.4;
  height: 3em; /* 限制標題高度 */
  overflow: hidden;
}

.job-stats-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #F9FAFB;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.stat-box { display: flex; flex-direction: column; align-items: center; }
.stat-box .label { font-size: 0.75rem; color: #aaa; margin-bottom: 4px; }
.stat-box .value { font-size: 1.25rem; font-weight: 700; color: var(--text-color); }
.stat-box .highlight { color: var(--primary-color); }
.divider { width: 1px; height: 30px; background: #e0e0e0; }

.card-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #aaa;
}

.btn-outline-sm {
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  padding: 5px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-outline-sm:hover { background: var(--primary-color); color: white; }


/* --- Applicant Sidebar --- */
.dashboard-card {
  background: #fff;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  height: 100%;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f5f5f5;
}
.card-head h3 { margin: 0; font-size: 1.2rem; color: var(--text-color); }
.link-view-all { font-size: 0.85rem; color: var(--secondary-color); text-decoration: none; }

.applicant-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.applicant-item {
  display: flex;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid #f9f9f9;
}
.applicant-item:last-child { border-bottom: none; }

.avatar {
  width: 42px;
  height: 42px;
  background: var(--input-bg);
  color: var(--secondary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 15px;
  font-size: 1.1rem;
}

.applicant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.info-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.name { font-weight: 600; font-size: 0.95rem; color: var(--text-color); }
.gpa-badge { 
  font-size: 0.7rem; background: #FFF3E0; color: #FF9800; 
  padding: 2px 6px; border-radius: 4px; font-weight: 600;
}

.job-target { font-size: 0.8rem; color: #666; margin-bottom: 2px; }
.apply-date { font-size: 0.75rem; color: #bbb; }

.btn-review {
  background: transparent;
  border: 1px solid #ddd;
  color: #666;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-review:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(125, 157, 156, 0.05);
}
</style>