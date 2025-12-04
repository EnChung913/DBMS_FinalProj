<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/axios';

// 定義資料型別
interface PendingAchievement {
  id: number;
  student: string;
  student_id: string; 
  title: string;
  category: string;   
  proof_link: string; 
  date: string;
}

interface MyResource {
  id: string;
  title: string;
  type: string;
  applicants: number;
  quota: number;
  status: 'Available' | 'Unavailable' | 'Closed';
  publish_date: string;
}

const pendingAchievements = ref<PendingAchievement[]>([]);
const myResources = ref<MyResource[]>([]);
const showAnimation = ref(false);

onMounted(async () => {
  setTimeout(() => showAnimation.value = true, 100);

  try {
    // ----------------------------------------------------------------
    // TO DO: 連接後端 API (Department Dashboard)
    // ----------------------------------------------------------------

    // 1. [GET] /api/department/achievements/pending
    // pendingAchievements.value = (await apiClient.get('/department/achievements/pending')).data;

    // 2. [GET] /api/department/resources
    // myResources.value = (await apiClient.get('/department/resources')).data;

    // --- MOCK DATA ---
    pendingAchievements.value = [
      { 
        id: 101, student: '王大明', student_id: 'B09901001', 
        title: 'ICPC 國際程式設計競賽 - 金牌', category: 'Competition',
        proof_link: '#', date: '2025-02-15'
      },
      { 
        id: 102, student: '李小華', student_id: 'B09901023', 
        title: '第15屆系學會會長', category: 'Service',
        proof_link: '#', date: '2025-02-18'
      },
      { 
        id: 103, student: '張偉', student_id: 'B09901055', 
        title: '校園親善大使', category: 'Service',
        proof_link: '#', date: '2025-02-20'
      }
    ];

    myResources.value = [
      { id: 'r1', title: '113學年度清寒優秀獎學金', type: 'Scholarship', applicants: 12, quota: 3, status: 'Available', publish_date: '2025-02-20' },
      { id: 'r2', title: '量子計算實驗室 (Quantum Lab) 專題生', type: 'Lab', applicants: 5, quota: 2, status: 'Available', publish_date: '2025-02-20' },
      { id: 'r3', title: '系辦公室工讀生', type: 'Others', applicants: 0, quota: 1, status: 'Closed', publish_date: '2025-02-20' }
    ];

  } catch (error) {
    console.error(error);
  }
});

const verifyAchievement = async (id: number, decision: boolean) => {
  // ----------------------------------------------------------------
  // TODO: [POST] /api/department/achievement/{id}/verify
  // ----------------------------------------------------------------
  console.log(`[Mock] Verify ID:${id} -> ${decision ? 'Approved' : 'Rejected'}`);
  const index = pendingAchievements.value.findIndex(a => a.id === id);
  if (index !== -1) {
    pendingAchievements.value.splice(index, 1);
  }
};
</script>

<template>
  <div class="dashboard-wrapper">
    
    <header class="hero-header">
      <div class="hero-content">
        <div class="user-welcome">
          <span class="sub-greeting">Department dashboard</span>
          <h1>某某系所</h1>
        </div>
        
        <div class="hero-actions">
           <button class="btn-primary-icon" @click="$router.push('/resource/create')">
             <span>+</span> Publish Resource
           </button>
        </div>
      </div>
    </header>

    <div class="main-grid">
      
      <section class="left-panel">
        <div class="dashboard-card full-height">
          <div class="card-header">
            <h3>Pending Performance Verification</h3>
            <span class="badge-count">{{ pendingAchievements.length }} students to be done</span>
          </div>
          
          <div class="table-container">
            <table class="styled-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Category</th>
                  <th>Achievement</th>
                  <th width="140">Verify</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="pendingAchievements.length === 0">
                  <td colspan="4" class="empty-state">There are currently no projects pending review.</td>
                </tr>
                <tr v-for="item in pendingAchievements" :key="item.id" class="table-row">
                  <td>
                    <div class="student-info">
                      <span class="name">{{ item.student }}</span>
                      <span class="sid">{{ item.student_id }}</span>
                    </div>
                  </td>
                  <td><span class="category-tag">{{ item.category }}</span></td>
                  <td>
                    <div class="achievement-detail">
                      <span class="title">{{ item.title }}</span>
                      <a :href="item.proof_link" class="link-proof" @click.prevent>Check certificate</a>
                    </div>
                  </td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon btn-approve" @click="verifyAchievement(item.id, true)" title="通過">✓</button>
                      <button class="btn-icon btn-reject" @click="verifyAchievement(item.id, false)" title="駁回">✕</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <aside class="right-panel">
        <div class="section-header-row">
          <h3>Resource Overview</h3>
          <span class="badge-count">{{ myResources.length }} Active</span>
          <router-link to="/department/resources" class="btn-view-all">
            <span class="btn-text">View All</span>
            <span class="arrow-icon">➭➭➭</span>
          </router-link>
        </div>
        
        <div class="resource-list">
          <div v-for="res in myResources" :key="res.id" class="manage-card">
            <div class="card-top">
              <span :class="['status-dot', res.status === 'Available' ? 'dot-green' : 'dot-gray']"></span>
              <span class="res-type">{{ res.type }}</span>
            </div>
            
            <h4 class="res-title">{{ res.title }}</h4>
            
            <div class="stats-row">
              <div class="stat-item">
                <span class="label">Quota</span>
                <span class="value">{{ res.quota }}</span>
              </div>
              <div class="divider"></div>
              <div class="stat-item">
                <span class="label">Applicants</span>
                <span class="value highlight">{{ res.applicants }}</span>
              </div>
            </div>

            <div class="card-actions">
              <span class="date">Published on: {{ res.publish_date }}</span>
              <button 
                class="btn-outline-sm" 
                @click="$router.push(`/resource/edit/${res.id}`)"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </aside>

    </div>
  </div>
</template>

<style scoped>
/* --- 佈局容器 (繼承 Student Dashboard 風格) --- */
.dashboard-wrapper {
  width: 95%;
  max-width: 1000px;
  min-width: 1000px;
  margin: 0 auto;
  padding-bottom: 60px;
  animation: fadeIn 0.6s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Hero Header (關鍵 CSS：對齊設定) --- */
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
  justify-content: space-between; /* ✅ 關鍵：這會把左邊文字和右邊按鈕推到最兩側 */
  align-items: center;            /* ✅ 關鍵：垂直置中對齊 */
  width: 100%;
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

.user-welcome h1 {
  font-size: 2rem;
  color: var(--accent-color);
  margin: 0;
}

.btn-primary-icon {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 10px 24px; 
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
.btn-primary-icon:hover {
  background-color: var(--accent-color);
  transform: translateY(-2px);
}
.btn-primary-icon span { font-size: 1.2rem; line-height: 1; }

/* --- Grid Layout --- */
.main-grid {
  display: grid;
  grid-template-columns: 4fr 3fr; 
  gap: 30px;
}

@media (max-width: 1024px) {
  .main-grid { grid-template-columns: 1fr; }
}

/* --- Common Card --- */
.dashboard-card {
  background: #fff;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
  height: 100%; /* 填滿高度 */
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f5f5f5;
}

.card-header h3 { margin: 0; color: var(--text-color); font-size: 1.2rem; }

.badge-count {
  background: #EBEBE8;
  color: var(--secondary-color);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* --- Table Styles --- */
.table-container { overflow-x: auto; }

.styled-table {
  width: 100%;
  border-collapse: collapse;
}

.styled-table th {
  text-align: left;
  padding: 12px 10px;
  color: var(--secondary-color);
  font-size: 0.85rem;
  font-weight: 500;
}

.table-row {
  border-bottom: 1px solid #f9f9f9;
  transition: background 0.2s;
}
.table-row:last-child { border-bottom: none; }
.table-row:hover { background-color: #FAFAFA; }

.styled-table td { padding: 15px 10px; vertical-align: middle; }

/* Student Info */
.student-info { display: flex; flex-direction: column; }
.name { font-weight: 600; color: var(--text-color); font-size: 0.95rem; }
.sid { color: #aaa; font-size: 0.8rem; }

/* Category Tag */
.category-tag {
  background: rgba(125, 157, 156, 0.1);
  color: var(--primary-color);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Achievement Detail */
.achievement-detail { display: flex; flex-direction: column; gap: 4px; }
.title { color: var(--text-color); font-size: 0.95rem; }
.link-proof { color: var(--primary-color); font-size: 0.8rem; text-decoration: none; }
.link-proof:hover { text-decoration: underline; }

/* Action Buttons */
.action-buttons { display: flex; gap: 10px; }

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-approve {
  background-color: #E8F5E9;
  color: #4CAF50;
}
.btn-approve:hover { background-color: #4CAF50; color: white; transform: scale(1.1); }

.btn-reject {
  background-color: #FFEBEE;
  color: #EF5350;
}
.btn-reject:hover { background-color: #EF5350; color: white; transform: scale(1.1); }

.empty-state { text-align: center; color: #aaa; padding: 30px; }


/* --- Right Panel: Resources --- */
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.section-header-row h3 { margin: 0; color: var(--accent-color); font-size: 1.1rem; }

.btn-view-all {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 700;
  font-size: 0.95rem;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  line-height: 1;
}
.btn-view-all:hover {
  background: rgba(125, 157, 156, 0.1);
  transform: translateX(3px); 
}

.arrow-icon {
  font-size: 1.5rem;      
  line-height: 0.8;       
  display: flex;          
  align-items: center;
  margin-top: -2px;      
}

.btn-text {
  display: inline-block;
  padding-top: 2px; 
}
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.manage-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
  transition: transform 0.2s;
}
.manage-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }

.card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-green { background-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2); }
.dot-gray { background-color: #ccc; }
.res-type { font-size: 0.75rem; color: #999; background: #f5f5f5; padding: 2px 8px; border-radius: 4px; }
.res-title {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: var(--text-color);
  line-height: 1.4;
  height: 3em; /* 限制標題高度 */
  overflow: hidden;
}
.stats-row {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background: #F9FAFB;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.stat-item { display: flex; flex-direction: column; align-items: center; }
.stat-item .label { font-size: 0.75rem; color: #aaa; margin-bottom: 4px; }
.stat-item .value { font-size: 1.25rem; font-weight: 700; color: var(--text-color); }
.stat-item .highlight { color: var(--primary-color); }
.divider { width: 1px; height: 30px; background: #e0e0e0; }

.card-actions { 
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
  padding: 7px 16px;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-outline-sm:hover { background: var(--primary-color); color: white; }
.btn-action.primary {
  flex: 1; padding: 6px 0; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
  background: var(--primary-color); border: 1px solid var(--primary-color); color: white;
}
.btn-action.primary:hover { opacity: 0.9; box-shadow: 0 4px 10px rgba(125, 157, 156, 0.3); }
</style>