<!-- src/views/company/Dashboard.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/axios';
import { useAuthStore } from '@/stores/auth';

// 定義資料介面
interface resource {
  resource_id: string;
  title: string;
  resource_type: string;       // e.g. Intern, Full-time
  quota: number;
  applied: number;
  status: 'Open' | 'Closed' | 'Draft';
  publish_date: string;
}

interface Applicant {
  user_id: string;
  name: string;
  resource: string;
  gpa: number;
  date: string;
  status: 'submitted' | 'reviewed' | 'interview';
}

const resources = ref<resource[]>([]);
const applicants = ref<Applicant[]>([]);
const showAnimation = ref(false);
const authStore = useAuthStore();
const name = authStore.user?.real_name || 'Company';


onMounted(async () => {
  setTimeout(() => showAnimation.value = true, 100);

  try {
    // ----------------------------------------------------------------
    // TODO: 連接後端 API (Company Dashboard)
    // ----------------------------------------------------------------
    
    // 1. [GET] /api/company/resources
    resources.value = (await apiClient.get('api/resource/my')).data;
    console.log(resources.value);
    // 2. [GET] /api/company/applications
    // applicants.value = (await apiClient.get('/company/applications')).data;



    applicants.value = [
      { user_id: 'u1', name: 'Alex Chen', resource: 'Frontend Engineer Intern', gpa: 3.9, date: '2025-02-22', status: 'submitted' },
      { user_id: 'u2', name: 'Betty Wu', resource: 'Frontend Engineer Intern', gpa: 4.1, date: '2025-02-21', status: 'reviewed' },
      { user_id: 'u3', name: 'Charlie Lin', resource: 'Backend Developer', gpa: 3.5, date: '2025-02-20', status: 'submitted' }
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
          <span class="sub-greeting">Company dashboard</span>
          <h1>{{ name }}</h1>
        </div>
        <div class="header-actions">
           <button class="btn-primary-large" @click="$router.push('/resource/create')">
             <span class="icon">+</span> Publish Resource
           </button>
        </div>
      </div>
    </header>

    <div class="main-grid">

      <aside class="left-panel">
        <div class="dashboard-card full-height">
          <div class="card-head">
            <h3>Recommended students</h3>
          </div>

          <ul class="applicant-list">
            <li v-for="app in applicants" :key="app.user_id" class="applicant-item">
              <div class="avatar">{{ app.name.charAt(0) }}</div>
              
              <div class="applicant-info">
                <div class="info-top">
                  <span class="name">{{ app.name }}</span>
                  <span class="gpa-badge">GPA {{ app.gpa }}</span>
                </div>
                <span class="resource-target">Recruit: {{ app.resource }}</span>
                <span class="apply-date">{{ app.date }}</span>
              </div>

              <button class="btn-review">Open</button>
            </li>
          </ul>
        </div>
      </aside>
      
      <section class="right-panel">
        <div class="section-header-row">
          <h3>Resource Overview</h3>
          <span class="badge-count">{{ resources.length }} Active</span>
          <router-link to="/company/resources" class="btn-view-all">
            <span class="btn-text">View All</span>
            <span class="arrow-icon">➭➭➭</span>
          </router-link>
        </div>

        <div class="resources-container">
          <div v-for="resource in resources" :key="resource.resource_id" class="resource-card">
            
            <div class="card-header">
              <div class="resource-meta">
                <span :class="['status-dot', getStatusClass(resource.status)]"></span>
                <span class="resource-type">{{ resource.resource_type }}</span>
              </div>
              <button class="btn-icon-more">⋮</button>
            </div>

            <h3 class="resource-title">{{ resource.title }}</h3>
            
            <div class="resource-stats-row">
              <div class="stat-box">
                <span class="label">Quota</span>
                <span class="value">{{ resource.quota }}</span>
              </div>
              <div class="divider"></div>
              <div class="stat-box">
                <span class="label">Applicants</span>
                <span class="value highlight">{{ resource.applied }}</span>
              </div>
            </div>

            <div class="card-footer">
              <span class="date">Published on: {{ resource.publish_date }}</span>
              <button 
                class="btn-outline-sm" 
                @click="$router.push(`/resource/edit/${resource.resource_id}`)"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* 繼承全域莫蘭迪變數 src/assets/main.css */

/* --- 佈局容器 --- */
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
  grid-template-columns: 4fr 3fr; 
  gap: 30px;
}

@media (max-width: 1024px) {
  .main-grid { grid-template-columns: 1fr; }
}

/* --- Section Title --- */
.section-title {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.section-title h3 { margin: 0; color: var(--accent-color); font-size: 1.1rem; }
.badge-count {
  background: #EBEBE8;
  color: var(--secondary-color);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* --- resource Cards Container --- */
.resources-container {
  display: grid;
  /* 自動適應寬度，最小 300px */
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.resource-card {
  background: #fff;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid rgba(0,0,0,0.02);
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
}

.resource-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(125, 157, 156, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.section-header-row h3 { margin: 0; color: var(--accent-color); font-size: 1.1rem; }
.resource-meta { display: flex; align-items: center; gap: 8px; }
.resource-type { font-size: 0.75rem; color: #999; background: #f5f5f5; padding: 2px 8px; border-radius: 4px; }

.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.status-green { background: #4CAF50; box-shadow: 0 0 0 2px rgba(76,175,80,0.2); }
.status-gray { background: #ccc; }
.status-yellow { background: #FFC107; }

.btn-icon-more {
  background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: #aaa;
}

.resource-title {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: var(--text-color);
  line-height: 1.4;
  height: 3em; /* 限制標題高度 */
  overflow: hidden;
}

.resource-stats-row {
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
  padding: 7px 16px;
  border-radius: 9px;
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

.resource-target { font-size: 0.8rem; color: #666; margin-bottom: 2px; }
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