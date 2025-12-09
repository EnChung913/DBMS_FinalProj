<script setup lang="ts">
import { ref, onMounted } from 'vue'
import apiClient from '@/api/axios'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()

// 1. 定義資源介面 (保持不變)
interface Resource {
  resource_id: string
  title: string
  resource_type: string
  quota: number
  applied: number
  status: 'Open' | 'Closed' | 'Draft'
  publish_date: string
}

// 2. [修改] 定義推薦學生介面 (對應後端 PushService 的回傳結構)
interface RecommendedStudent {
  user_id: string
  real_name: string
  department_id: string // 顯示系所
  gpa: number
  score: number // 推薦分數 (0~1)
  // 如果後端回傳有包含頭像或其他欄位可加在此
}

const resources = ref<Resource[]>([])
const recommendedStudents = ref<RecommendedStudent[]>([]) // [修改] 變數名稱
const showAnimation = ref(false)
const authStore = useAuthStore()
const name = authStore.user?.real_name || 'Company'

onMounted(async () => {
  setTimeout(() => (showAnimation.value = true), 100)
  
  // 檢查 2FA 狀態
  try {
    const tfa_status = await apiClient.get('/api/auth/2fa/status')
    authStore.set2FAEnabled(tfa_status.data.is_2fa_enabled)
  } catch (e) {
    console.error('2FA check failed', e)
  }

  try {
    const resResources = await apiClient.get('api/resource/my')
    resources.value = resResources.data

    const resRecommend = await apiClient.get('/api/push/student')
    
    recommendedStudents.value = resRecommend.data;
    console.log('Recommended Students:', recommendedStudents.value)

  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
})

const getStatusClass = (status: string) => {
  switch (status) {
    case 'Open':
      return 'status-green'
    case 'Closed':
      return 'status-gray'
    default:
      return 'status-yellow'
  }
}

// 格式化百分比 (e.g. 0.85 -> 85%)
const formatScore = (score: number) => {
  return Math.round(score * 100) + '%'
}

const handle2FA = () => {
  router.push('/2fa')
}

// 跳轉到學生詳細頁面 (需實作該路由)
const viewStudent = (studentId: string) => {
  router.push(`/company/student/${studentId}`)
}
</script>

<template>
  <div class="dashboard-wrapper">
    <header class="hero-header">
      <div class="hero-content">
        <div class="header-text">
          <span class="sub-greeting">Company dashboard</span>
          <h1>{{ name }}</h1>
          <button
            v-if="!authStore.user?.is_2fa_enabled"
            class="btn-2fa"
            @click="handle2FA"
            title="啟用/驗證雙重認證"
          >
            <span class="icon">⚠️</span>
            <span>Enable 2FA</span>
          </button>
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
            <h3>Recommended Talent</h3>
            <router-link to="/company/search" class="btn-search-talent">
              <span class="icon">🔍</span> Search
            </router-link>
          </div>

          <div v-if="recommendedStudents.length === 0" class="empty-state">
            Running AI matching...
          </div>

          <ul v-else class="applicant-list">
            <li 
              v-for="student in recommendedStudents" 
              :key="student.user_id" 
              class="applicant-item"
            >
              <div class="avatar" :class="{'high-match': student.score > 0.8}">
                {{ student.real_name ? student.real_name.charAt(0).toUpperCase() : 'U' }}
              </div>

              <div class="applicant-info">
                <div class="info-top">
                  <span class="name">{{ student.real_name }}</span>
                  <span class="match-badge" :title="'AI Match Score: ' + student.score">
                     {{ formatScore(student.score) }} Match
                  </span>
                </div>
                
                <span class="resource-target">{{ student.department_id }}</span>
                <span class="gpa-text">GPA: {{ student.gpa }}</span>
              </div>

              <button class="btn-review" @click="viewStudent(student.user_id)">
                View
              </button>
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
              <span class="date">Published: {{ new Date(resource.publish_date).toLocaleDateString() }}</span>
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
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- Hero Header --- */
.hero-header {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #f7f5f2 0%, #ffffff 100%);
  padding: 30px 40px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
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
  .main-grid {
    grid-template-columns: 1fr;
  }
}

/* --- Section Title --- */
.section-title {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
}
.section-title h3 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.1rem;
}
.badge-count {
  background: #ebebe8;
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
  border: 1px solid rgba(0, 0, 0, 0.02);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
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
.section-header-row h3 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.1rem;
}
.resource-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.resource-type {
  font-size: 0.75rem;
  color: #999;
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-green {
  background: #4caf50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}
.status-gray {
  background: #ccc;
}
.status-yellow {
  background: #ffc107;
}

.btn-icon-more {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #aaa;
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
  background: #f9fafb;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stat-box .label {
  font-size: 0.75rem;
  color: #aaa;
  margin-bottom: 4px;
}
.stat-box .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-color);
}
.stat-box .highlight {
  color: var(--primary-color);
}
.divider {
  width: 1px;
  height: 30px;
  background: #e0e0e0;
}

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
.btn-outline-sm:hover {
  background: var(--primary-color);
  color: white;
}

/* --- Applicant Sidebar --- */
.dashboard-card {
  background: #fff;
  border-radius: 20px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
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
.card-head h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-color);
}

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
.applicant-item:last-child {
  border-bottom: none;
}

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

.info-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-color);
}
.gpa-badge {
  font-size: 0.7rem;
  background: #fff3e0;
  color: #ff9800;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.resource-target {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 2px;
}
.apply-date {
  font-size: 0.75rem;
  color: #bbb;
}

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
.btn-2fa {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: rgba(7, 0, 0, 0.2); /* 半透明背景 */
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
}

.btn-2fa:hover {
  background-color: rgba(74, 222, 128, 0.2); /* 懸停時變為微綠色 */
  border-color: #4ade80;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.btn-2fa .icon {
  font-size: 1.1rem;
}

.btn-search-talent {
  margin-left: auto; /* 將這組按鈕推到右邊 (如果 btn-view-all 也有 auto，兩者會擠在右邊) */
  margin-right: 15px; /* 與 View All 保持距離 */
  
  display: inline-flex; align-items: center; gap: 6px;
  background: #fff; border: 1px solid var(--primary-color);
  color: var(--primary-color); padding: 6px 12px; border-radius: 20px;
  text-decoration: none; font-size: 0.85rem; font-weight: 600;
  transition: all 0.2s;
}
.btn-search-talent:hover {
  background: var(--primary-color); color: white;
}
</style>
