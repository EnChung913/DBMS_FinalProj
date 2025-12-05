<!-- src/views/student/StudentDashboard.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/axios';
import type { Resource, GPA, Achievement } from '@/types';
import { useStudentStore } from '@/stores/student';

// UI 狀態
const showAnimation = ref(false);

// 資料 Ref（為 Dashboard 本地顯示而存在）
const studentInfo = ref({ name: '', id: '', dept: '', grade: 0 });
const gpaRecords = ref<GPA[]>([]);
const achievements = ref<Achievement[]>([]);
const recommendedResources = ref<Resource[]>([]);

onMounted(async () => {
  setTimeout(() => (showAnimation.value = true), 100);
  const studentStore = useStudentStore();
  console.log('studentStore initialized:', studentStore);

  try {
    // Profile
    if (!studentStore.hasProfile) {
      const resInfo = await apiClient.get('/api/student/profile');
      const info = resInfo.data;

      studentStore.setProfile({
        user_id: info.user.user_id,
        name: info.user.real_name,
        student_id: info.student_id,
        department_id: info.department_id,
        grade: info.grade,
        is_poor: info.is_poor,
      });
    }

    // GPA Records
    if (!studentStore.hasGpaRecords) {
      const resGpa = await apiClient.get('/api/student/gpa');
      studentStore.setGpaRecords(resGpa.data);
    }

    studentInfo.value = {
      name: studentStore.name,
      id: studentStore.student_id,
      dept: studentStore.department_id,
      grade: studentStore.grade,
    };

    gpaRecords.value = studentStore.gpa_records;
    
    // Achievements
    const resAchiev = await apiClient.get('/api/student/achievement');
    achievements.value = resAchiev.data;

    // ---------------------------------------------------------
    // 4. 推薦資源（API 尚未完成 → 保留 mock）
    // ---------------------------------------------------------
    recommendedResources.value = [
      {
        resource_id: 'r1',
        title: 'Software Engineer Intern',
        resource_type: 'Internship',
        quota: 5,
        description: 'Python/Vue.js required.',
        deadline: '2025-05-30',
        status: 'Available',
        supplier_name: 'TSMC',
        match_score: 98,
      },
      {
        resource_id: 'r2',
        title: 'Lab Research Assistant',
        resource_type: 'Lab',
        quota: 2,
        description: 'Quantum Computing Lab.',
        deadline: '2025-06-01',
        status: 'Available',
        supplier_name: 'Prof. Chang',
        match_score: 88,
      },
    ];
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
  }
});

// ---------------------------------------------------------
// UI Helper
// ---------------------------------------------------------
const getStatusClass = (status: string) => {
  if (status === 'recognized') return 'status-ok';
  if (status === 'rejected') return 'status-err';
  return 'status-wait';
};

// 申請功能的邏輯
const handleApply = async (resourceId: string) => {
  if (!confirm('Are you sure you want to apply for this resource?')) return;

  try {
    // ----------------------------------------------------------------
    // TO DO: 連接後端 API 申請資源
    // [POST] /api/student/application
    // Body: { resource_id: string }
    // ----------------------------------------------------------------
    
    // await apiClient.post('/student/application', { resource_id: resourceId });

    // --- Mock Data (模擬成功) ---
    console.log(`[Mock] Applied for resource: ${resourceId}`);
    await new Promise(r => setTimeout(r, 500));
    // ---------------------------

    alert('Application Submitted Successfully!');
    
    // 選用：申請後可以更新列表狀態 (例如把該卡片標記為 Applied)
    // fetchDashboardData(); 

  } catch (error) {
    console.error(error);
    alert('Application failed. Please try again later.');
  }
};

</script>


<template>
  <div class="dashboard-wrapper">
    <header class="hero-header">
      <div class="hero-content">
        <div class="user-welcome">
          <span class="sub-greeting">{{ studentInfo.dept }} | {{ studentInfo.id }}</span>
          <h1>{{ studentInfo.name }}</h1>
        </div>
        <div class="hero-stats">
          <div class="stat-box">
            <span class="label">Grade</span>
            <span class="value">{{ studentInfo.grade }}</span>
          </div>
          <router-link to="/student/applications" class="stat-box clickable">
            <span class="label">My Applications</span>
            <span class="value">4</span> 
          </router-link>
        </div>
      </div>
    </header>

    <div class="main-grid">
      <aside class="left-panel">
        <div class="dashboard-card gpa-card">
          <div class="card-header"><h3>GPA Trend</h3></div>
          <div class="gpa-list">
            <div v-for="rec in gpaRecords" :key="rec.semester" class="gpa-row">
              <span class="semester-label">{{ rec.semester }}</span>
              <div class="progress-track">
                <div class="progress-bar" :style="{ width: showAnimation ? (rec.gpa / 4.3 * 100) + '%' : '0%' }"></div>
              </div>
              <span class="score-label">{{ rec.gpa }}</span>
            </div>
          </div>
        </div>

        <div class="dashboard-card">
          <div class="card-header"><h3>Achievements</h3>
          <button 
            class="btn-icon-add" 
            title="新增成就"
            @click="$router.push('/student/upload-achievement')"
          >
            +
          </button>
          </div>
          <ul class="achieve-list">
            <li v-for="item in achievements" :key="item.achievement_id">
              <span class="achieve-title">{{ item.title }}</span>
              <span :class="['status-badge', getStatusClass(item.status)]">{{ item.status }}</span>
            </li>
          </ul>
        </div>
      </aside>

      <main class="right-panel">
        <div class="section-title-row" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2>Recommended Resources</h2>
          </div>
    
          <router-link to="/student/resources" class="btn-view-all">
            <span class="btn-text">View All</span>
            <span class="arrow-icon">➭➭➭</span>
          </router-link>
        </div>
        <div class="resource-grid">
          <div v-for="res in recommendedResources" :key="res.resource_id" class="resource-card">
            <div class="match-badge">
              <span class="score">{{ res.match_score }}%</span>
            </div>
            <div class="res-content">
              <h3 class="res-title">{{ res.title }}</h3>
              <p class="res-supplier">{{ res.supplier_name }}</p>
              <button 
                class="btn-apply" 
                @click="handleApply(res.resource_id)"
              >
                Apply Now !
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/main.css';
/* --- 全局容器設定 --- */
.dashboard-wrapper {
  /* 寬度解禁：最大 1440px，佔螢幕 95% */
  width: 95%;
  max-width: 900px;
  min-width: 900px;
  margin: 0 auto;
  padding-bottom: 60px;
  /* 加上淡入動畫 */
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Hero Header --- */
.hero-header {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #F7F5F2 0%, #ffffff 100%);
  padding: 30px 40px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 10px 30px rgba(125, 157, 156, 0.05); /* 極淡的莫蘭迪陰影 */
}

.hero-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sub-greeting {
  color: var(--secondary-color);
  font-size: 0.95rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: block;
  margin-bottom: 8px;
}

.user-welcome h1 {
  font-size: 2.2rem;
  color: var(--accent-color);
  margin: 0;
  font-weight: 700;
}

.hero-stats {
  display: flex;
  gap: 40px;
}

.stat-box {
  text-align: right;
}

.stat-box .label {
  display: block;
  font-size: 0.85rem;
  color: var(--secondary-color);
  margin-bottom: 5px;
}

.stat-box .value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--primary-color);
  line-height: 1;
}

/* --- Main Grid Layout --- */
.main-grid {
  display: grid;
  /* 左側固定 360px，右側自動填滿 */
  grid-template-columns: 360px 1fr; 
  gap: 30px;
}

@media (max-width: 1024px) {
  .main-grid {
    grid-template-columns: 1fr; /* 平板/手機轉為單欄 */
  }
}

/* --- Common Card Style --- */
.dashboard-card {
  background: #fff;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
  margin-bottom: 25px;
  transition: transform 0.3s ease;
}

.dashboard-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-color);
}

/* --- Left Panel: GPA & Achievement --- */
.gpa-row {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.semester-label {
  width: 50px;
  font-size: 0.9rem;
  color: var(--secondary-color);
  font-weight: 500;
}

.progress-track {
  flex: 1;
  height: 10px;
  background-color: #F0F2F5;
  border-radius: 5px;
  margin: 0 15px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #9FB1BC, #7D9D9C); /* 莫蘭迪漸層 */
  border-radius: 5px;
  transition: width 1.2s cubic-bezier(0.22, 1, 0.36, 1); /* 平滑緩動動畫 */
}

.score-label {
  width: 30px;
  text-align: right;
  font-weight: bold;
  color: var(--text-color);
}

.achieve-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.achieve-list li {
  padding: 15px 0;
  border-bottom: 1px solid #f5f5f5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.achieve-list li:last-child { border-bottom: none; }

.achieve-content {
  display: flex;
  flex-direction: column;
}

.achieve-title {
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 4px;
}
.achieve-date {
  font-size: 0.8rem;
  color: #aaa;
}

.status-badge {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 600;
}
.status-ok { background: rgba(125, 157, 156, 0.15); color: #7D9D9C; }
.status-wait { background: rgba(159, 177, 188, 0.15); color: #9FB1BC; }
.status-err { background: rgba(217, 140, 140, 0.15); color: #D98C8C; }

.btn-icon-add {
  background: var(--input-bg);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: var(--accent-color);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-icon-add:hover { background: #dcdcdc; }


/* --- Right Panel: Resources --- */
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.section-title-row h2 {
  font-size: 1.5rem;
  color: var(--accent-color);
  margin: 0 0 5px 0;
}

.subtitle {
  color: var(--secondary-color);
  margin: 0;
  font-size: 0.9rem;
}

.filter-tabs {
  display: flex;
  gap: 10px;
}

.tab {
  background: transparent;
  border: 1px solid transparent;
  padding: 6px 16px;
  border-radius: 20px;
  color: var(--secondary-color);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.tab.active, .tab:hover {
  background: #fff;
  color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  font-weight: 500;
}

.resource-grid {
  display: grid;
  /* 智慧網格：根據寬度自動決定要放 1 張還是 2 張卡片 */
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 25px;
}

.resource-card {
  background: #fff;
  border-radius: 20px;
  padding: 0; /* 內部用 padding */
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.resource-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(125, 157, 156, 0.15); /* 懸浮時的莫蘭迪色陰影 */
}

/* 左上角的媒合分數標籤 */
.match-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #E6F0F0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
  z-index: 2;
}
.match-badge .score { font-size: 1rem; font-weight: 800; color: var(--primary-color); line-height: 1; }
.match-badge .label { font-size: 0.6rem; color: #aaa; text-transform: uppercase; margin-top: 2px; }

.res-content {
  padding: 25px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.res-tags {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}
.tag-type {
  background: rgba(125, 157, 156, 0.1);
  color: var(--primary-color);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.tag-quota {
  background: #F7F5F2;
  color: var(--text-color);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
}

.res-title {
  font-size: 1.2rem;
  margin: 0 0 5px 0;
  color: var(--text-color);
  line-height: 1.4;
}

.res-supplier {
  color: var(--secondary-color);
  font-size: 0.9rem;
  margin: 0 0 15px 0;
}

.res-desc {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 20px;
  flex: 1; /* 讓文字撐開，按鈕對齊底部 */
  display: -webkit-box;
  -webkit-line-clamp: 2; /* 限制顯示兩行 */
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.res-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f5f5f5;
  padding-top: 15px;
  margin-top: auto;
}

.deadline {
  font-size: 0.85rem;
  color: #999;
}

.btn-apply {
  background: transparent;
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-apply:hover {
  background: var(--primary-color);
  color: #fff;
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.3);
}

.btn-view-all {
  /* --- 佈局與防換行核心設定 --- */
  display: inline-flex;    /* 關鍵：讓內容物緊密排列 */
  align-items: center;     /* 垂直置中 */
  gap: 8px;                /* 文字與箭頭的間距 */
  white-space: nowrap;     /* 關鍵：強制文字絕對不准換行 */
  
  /* --- 外觀設定 --- */
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 700;        /* 加粗一點比較好看 */
  font-size: 0.95rem;
  padding: 8px 16px;       /* 增加一點內距，讓按鈕大一點 */
  border-radius: 8px;
  border: 1px solid transparent; /* 預留邊框位置 */
  transition: all 0.2s ease;
  line-height: 1;
}

.btn-view-all:hover {
  background: rgba(125, 157, 156, 0.1);
  transform: translateX(3px); /* 懸浮時整體稍微往右移 */
}

.arrow-icon {
  font-size: 1.5rem;       /* 在這裡調整箭頭大小 */
  line-height: 0.8;        /* 縮小行高，避免撐開按鈕高度 */
  display: flex;           /* 讓箭頭符號本身也保持彈性盒模型，消除怪異間距 */
  align-items: center;
  margin-top: -2px;        /* 微調：視字體而定，有時需要往上一點點才視覺置中 */
}

.btn-text {
  display: inline-block;
  padding-top: 2px; /* 視字體情況微調 */
}

.stat-box.clickable {
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s;
  display: block; /* 讓 router-link 變成區塊 */
}
.stat-box.clickable:hover {
  transform: translateY(-3px);
}
.stat-box.clickable .value {
  color: var(--primary-color); /* 保持顏色一致 */
}
</style>