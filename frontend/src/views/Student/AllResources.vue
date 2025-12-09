<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue' // 加入 watch
import { useRouter } from 'vue-router'
import apiClient from '@/api/axios'
import type { Resource } from '@/types'
import { useStudentStore } from '@/stores/student'

const router = useRouter()
const isLoading = ref(false)
const allResources = ref<Resource[]>([])
const activeTab = ref('All')
const student = useStudentStore()

// --- 分頁相關狀態 (新增) ---
const currentPage = ref(1)
const itemsPerPage = 20 // 設定每頁顯示 50 筆

// Filter (原始邏輯保留，作為資料來源)
const filteredResources = computed(() => {
  const list =
    activeTab.value === 'All'
      ? allResources.value
      : allResources.value.filter((r) => r.resource_type === activeTab.value)

  const map = new Map<string, Resource>()
  for (const r of list) {
    if (!map.has(r.resource_id)) map.set(r.resource_id, r)
  }

  const enriched = [...map.values()].map((r) => {
    const e = meetsCondition(r)
    return { ...r, eligibility: e }
  })

  enriched.sort((a, b) => {
    return Number(b.eligibility.overall) - Number(a.eligibility.overall)
  })

  return enriched
})

// --- 分頁計算邏輯 (新增) ---
// 計算總頁數
const totalPages = computed(() => {
  return Math.ceil(filteredResources.value.length / itemsPerPage)
})

// 切割出當前頁面要顯示的資料
const paginatedResources = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredResources.value.slice(start, end)
})

// 當 Filter 改變時 (例如切換 Tab)，重置回第一頁
watch(activeTab, () => {
  currentPage.value = 1
})

// 換頁函式
const changePage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    // 換頁後自動滾動到列表頂部 (增強體驗)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

const meetsCondition = (r: Resource) => {
  const deptOK =
    r.department_id === null ||
    r.department_id === undefined ||
    r.department_id === student.department_id
  const avgGpaOK =
    r.avg_gpa === null ||
    r.avg_gpa === undefined ||
    (student.avg_gpa !== null && student.avg_gpa >= r.avg_gpa)
  const currentGpaOK =
    r.current_gpa === null ||
    r.current_gpa === undefined ||
    (student.current_gpa !== null && student.current_gpa >= r.current_gpa)
  const poorOK = r.is_poor === null || r.is_poor === undefined || r.is_poor === student.is_poor

  return {
    deptOK,
    avgGpaOK,
    currentGpaOK,
    poorOK,
    overall: deptOK && avgGpaOK && currentGpaOK && poorOK,
  }
}

onMounted(async () => {
  isLoading.value = true
  try {
    const res = await apiClient.get('/api/resource/list')
    allResources.value = res.data

    if (!student.hasProfile) {
      const resInfo = await apiClient.get('/api/student/profile')
      const info = resInfo.data
      student.setProfile({
        user_id: info.user.user_id,
        name: info.user.real_name,
        student_id: info.student_id,
        department_id: info.department_id,
        grade: info.grade,
        is_poor: info.is_poor,
      })
    }
    if (!student.hasGpaRecords) {
      const resGpa = await apiClient.get('/api/student/gpa')
      student.setGpaRecords(resGpa.data)
    }
    await new Promise((r) => setTimeout(r, 300))
  } catch (error) {
    console.error(error)
  } finally {
    isLoading.value = false
  }
})

const goBack = () => router.back()

const handleApply = (resourceId: string) => {
  router.push(`/student/apply/${resourceId}`)
}
</script>

<template>
  <div class="gallery-container">
    <div class="gallery-header">
      <div class="title-row">
        <button class="btn-back" @click="goBack">⮐ Back</button>
        <h1>Resource Gallery</h1>
      </div>

      <div class="filter-bar">
        <button
          v-for="tab in ['All', 'Internship', 'Scholarship', 'Lab', 'Others']"
          :key="tab"
          :class="['filter-pill', { active: activeTab === tab }]"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-area">
      <div class="spinner"></div>
      <p>Curating resources...</p>
    </div>

    <div v-else class="gallery-content">
      <div class="pagination-info">
        Showing {{ paginatedResources.length }} of {{ filteredResources.length }} resources
      </div>

      <div class="gallery-grid">
        <div v-for="res in paginatedResources" :key="res.resource_id" class="gallery-card">
          <div class="card-body">
            <div class="card-top-row">
              <span class="type-badge">{{ res.resource_type }}</span>
              <span v-if="res.eligibility.overall" class="match-badge eligible">Eligible</span>
              <span v-else class="match-badge not-eligible">Not Eligible</span>
            </div>

            <h3 class="card-title">{{ res.title }}</h3>

            <div class="card-meta">
              <span class="supplier">🏢 {{ res.supplier_name }}</span>
              <span class="deadline">📅 {{ res.deadline }}</span>
            </div>
            <div class="card-conditions">
              <div class="cond-label">Eligibility Conditions</div>
              <div class="cond-list">
                <span v-if="res.department_id" class="cond-pill">Dept: {{ res.department_id }}</span>
                <span v-if="res.avg_gpa !== null" class="cond-pill">Avg GPA ≥ {{ res.avg_gpa }}</span>
                <span v-if="res.current_gpa !== null" class="cond-pill"
                  >Current GPA ≥ {{ res.current_gpa }}</span
                >
                <span v-if="res.is_poor !== null" class="cond-pill">
                  {{ res.is_poor ? 'Economically disadvantaged only' : 'Not limited' }}
                </span>
              </div>
            </div>
            <p class="card-desc">{{ res.description }}</p>

            <div class="card-footer">
              <button class="btn-explore" @click="handleApply(res.resource_id)">Apply</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="totalPages > 1" class="pagination-controls">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1" 
          @click="changePage(currentPage - 1)"
        >
          Prev
        </button>
        
        <span class="page-info">
          Page {{ currentPage }} / {{ totalPages }}
        </span>
        
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages" 
          @click="changePage(currentPage + 1)"
        >
          Next
        </button>
      </div>
    </div>
  </div>
</template>
<style scoped>
@import '@/assets/main.css';

/* --- 原本的樣式保持完全不動 --- */
.gallery-container {
  padding: 40px 5%;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}
.gallery-header {
  margin-bottom: 50px;
  text-align: center;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 20px;
}
.btn-back {
  position: absolute;
  left: 0;
  background: transparent;
  border: none;
  color: var(--secondary-color);
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-back:hover {
  transform: translateX(-5px);
  color: var(--primary-color);
}
h1 {
  font-size: 2.2rem;
  color: var(--accent-color);
  letter-spacing: 1px;
  margin: 0;
}
.filter-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}
.filter-pill {
  background: #fff;
  border: 1px solid #ddd;
  padding: 8px 20px;
  border-radius: 30px;
  color: var(--text-color);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}
.filter-pill.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.4);
}
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  row-gap: 80px;
  padding-bottom: 60px;
}
@media (max-width: 1024px) {
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .gallery-grid {
    grid-template-columns: 1fr;
  }
}
.gallery-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.02);
  padding: 25px;
  position: relative;
  overflow: hidden;
}
.gallery-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(125, 157, 156, 0.15);
  border-color: rgba(125, 157, 156, 0.2);
}
.gallery-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 5px;
  background: linear-gradient(90deg, #9fb1bc, #7d9d9c);
  opacity: 0.8;
}
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}
.type-badge {
  background: rgba(125, 157, 156, 0.1);
  color: var(--primary-color);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.match-badge {
  background: #fdf2f2;
  color: #d98c8c;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
}
.match-badge.eligible {
  background: #ecfdf5;
  color: #059669;
}
.match-badge.not-eligible {
  background: #fdf2f2;
  color: #d98c8c;
}
.card-title {
  margin: 0 0 10px 0;
  font-size: 1.35rem;
  color: var(--text-color);
  line-height: 1.3;
  font-weight: 700;
}
.card-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #f5f5f5;
}
.card-desc {
  font-size: 0.95rem;
  color: #666;
  line-height: 1.6;
  margin-bottom: 30px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  margin-top: auto;
}
.btn-explore {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px solid var(--primary-color);
  color: var(--primary-color);
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-explore:hover {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.2);
}
.loading-area {
  text-align: center;
  padding: 60px;
  color: var(--secondary-color);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.card-conditions {
  margin-top: 0.5rem;
  font-size: 0.85rem;
}
.cond-label {
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.cond-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.cond-pill {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid #ddd;
  font-size: 0.8rem;
}

/* ========================================= */
/* ✅ Modal 樣式 (獨立於原本版面) */
/* ========================================= */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
  animation: fadeIn 0.2s ease-out;
}

.modal-content {
  background: white;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  border-radius: 16px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #333;
}
.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 0 8px;
  line-height: 1;
}
.btn-close:hover {
  color: #333;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}
.modal-title {
  font-size: 1.5rem;
  color: #2c3e50;
  margin: 0 0 12px 0;
}
.modal-tags {
  margin-bottom: 16px;
}
.tag {
  background: #f0f4f8;
  color: #555;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-right: 8px;
  font-weight: 500;
}
.modal-desc {
  color: #444;
  line-height: 1.6;
  margin-bottom: 16px;
  white-space: pre-wrap;
}
.supplier-info {
  font-size: 0.9rem;
  color: #666;
}
.divider {
  border: 0;
  border-top: 1px solid #eee;
  margin: 24px 0;
}
.form-section h4 {
  margin: 0 0 16px 0;
  color: #333;
}
.form-group {
  margin-bottom: 20px;
}
.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.95rem;
}

/* --- 🌟 新增：漂亮的檔案上傳樣式 --- */
.hidden-input {
  display: none;
}

.custom-file-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 110px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #f9fafb;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 20px;
}
.custom-file-upload:hover {
  border-color: var(--primary-color);
  background: #f0fdfa;
}

/* 上傳後的實線樣式 */
.custom-file-upload.has-file {
  border-style: solid;
  border-color: var(--primary-color);
  background: #fff;
}

.upload-placeholder {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}
.upload-icon {
  font-size: 2rem;
  opacity: 0.6;
}
.upload-text {
  font-size: 0.95rem;
  color: #555;
  font-weight: 500;
}
.upload-hint {
  font-size: 0.8rem;
  color: #999;
}

.file-info {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 12px;
}
.file-icon {
  font-size: 1.5rem;
  background: #f3f4f6;
  padding: 10px;
  border-radius: 8px;
}
.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.file-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.file-size {
  font-size: 0.75rem;
  color: #888;
}
.change-btn {
  font-size: 0.8rem;
  color: var(--primary-color);
  font-weight: 600;
  background: rgba(0, 0, 0, 0.03);
  padding: 4px 10px;
  border-radius: 6px;
}

.custom-file-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box; /* ✅ 一定要加這行 */
  min-height: 110px;
  /* ...其他保持不變... */
}
/* --- 🌟 漂亮的 Checkbox (你選的 Morandi 風格) --- */
.checkbox-group {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(125, 157, 156, 0.08); /* 柔和背景 */
  padding: 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}
.checkbox-group:hover {
  background: rgba(125, 157, 156, 0.15);
}
.checkbox-group input {
  margin-top: 3px;
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
  cursor: pointer;
  flex-shrink: 0;
}
.checkbox-group label {
  font-size: 0.9rem;
  color: #2c3e50;
  line-height: 1.5;
  cursor: pointer;
}

/* Footer */
.modal-footer {
  padding: 16px 24px;
  background: #f9f9f9;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn-cancel {
  padding: 10px 20px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  font-weight: 500;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background: #f0f0f0;
}
.btn-submit {
  padding: 10px 24px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.btn-submit:disabled {
  background: #a5b4fc;
  cursor: not-allowed;
  opacity: 0.7;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.pagination-info {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
  text-align: right;
  padding: 0 1rem;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 2rem;
  padding: 1rem;
}

.page-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background-color: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.page-btn:hover:not(:disabled) {
  background-color: #f0f0f0;
  border-color: #bbb;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f9f9f9;
}

.page-info {
  font-weight: bold;
  color: #333;
}
</style>
