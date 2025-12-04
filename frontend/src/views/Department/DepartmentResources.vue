<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const router = useRouter();
const isLoading = ref(false);
const myResources = ref<any[]>([]);
const activeTab = ref('All');

// 資源類型篩選
const filteredResources = computed(() => {
  if (activeTab.value === 'All') return myResources.value;
  return myResources.value.filter(r => r.type === activeTab.value);
});

onMounted(async () => {
  isLoading.value = true;
  try {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/resource/my (或 /department/resources)
    // ----------------------------------------------------------------
    // const res = await apiClient.get('/resource/my');
    // myResources.value = res.data;

    // --- Mock Data ---
    await new Promise(r => setTimeout(r, 500));
    myResources.value = [
      { id: 'r1', title: '113學年度清寒優秀獎學金', type: 'Scholarship', applicants: 12, quota: 3, status: 'Available', date: '2025-02-01' },
      { id: 'r2', title: '量子計算實驗室 (Quantum Lab) 專題生', type: 'Lab', applicants: 5, quota: 2, status: 'Available', date: '2025-02-10' },
      { id: 'r3', title: '系辦公室工讀生', type: 'Others', applicants: 0, quota: 1, status: 'Closed', date: '2024-12-01' },
      { id: 'r4', title: '人工智慧學程助教 (TA)', type: 'Internship', applicants: 8, quota: 4, status: 'Available', date: '2025-02-20' },
      { id: 'r5', title: '海外交換計畫補助', type: 'Scholarship', applicants: 20, quota: 5, status: 'Unavailable', date: '2025-01-15' },
    ];

  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const goBack = () => router.back();

const handleEdit = (id: string) => {
  router.push(`/resource/edit/${id}`);
};
</script>

<template>
  <div class="gallery-container">
    
    <div class="gallery-header">
      <div class="title-row">
        <button class="btn-back" @click="goBack">⮐ Back</button>
        <h1>Resource Management</h1>
      </div>
      
      <div class="filter-bar">
        <button 
          v-for="tab in ['All', 'Scholarship', 'Lab', 'Internship', 'Others']" 
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
      <p>Loading resources...</p>
    </div>
    
    <div v-else class="gallery-grid">
      <div v-for="res in filteredResources" :key="res.id" class="gallery-card">
        
        <div class="card-body">
          
          <div class="card-top-row">
            <span class="type-badge">{{ res.type }}</span>
            <span :class="['status-badge', res.status === 'Available' ? 'status-green' : 'status-gray']">
              {{ res.status }}
            </span>
          </div>

          <h3 class="card-title">{{ res.title }}</h3>
          
          <div class="stats-container">
            <div class="stat-box">
              <span class="stat-label">Quota</span>
              <span class="stat-value">{{ res.quota }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-box">
              <span class="stat-label">Applicants</span>
              <span class="stat-value highlight">{{ res.applicants }}</span>
            </div>
          </div>
          
          <div class="card-meta">
            <span>📅 Published: {{ res.date }}</span>
          </div>
          
          <div class="card-footer">
             <button class="btn-action outline" @click="handleEdit(res.id)">Edit</button>
             <button class="btn-action primary">???</button>
          </div>
        </div>
        
      </div>
    </div>

  </div>
</template>

<style scoped>
@import '@/assets/main.css';

/* --- Container & Header (與 AllResources 一致) --- */
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
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 20px;
}

.title-row h1 { grid-column: 2; margin: 0; font-size: 2.2rem; color: var(--accent-color); }

.btn-back {
  justify-self: start;
  background: transparent;
  border: none;
  color: var(--secondary-color);
  font-size: 1rem;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-back:hover { transform: translateX(-5px); color: var(--primary-color); }

/* --- Filters --- */
.filter-bar {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-pill {
  background: #fff; border: 1px solid #ddd; padding: 8px 20px;
  border-radius: 30px; color: var(--text-color); cursor: pointer;
  transition: all 0.3s; font-size: 0.95rem;
}
.filter-pill.active {
  background: var(--primary-color); color: white; border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.4);
}

/* --- Gallery Grid --- */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 強制三欄 */
  gap: 30px;
  row-gap: 40px;
  padding-bottom: 60px;
}

@media (max-width: 1024px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .gallery-grid { grid-template-columns: 1fr; } }

/* --- Management Card --- */
.gallery-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03); 
  border: 1px solid rgba(0,0,0,0.02);
  padding: 25px;
  display: flex; flex-direction: column;
  position: relative; overflow: hidden;
  transition: transform 0.2s;
}

.gallery-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px rgba(125, 157, 156, 0.15);
  border-color: rgba(125, 157, 156, 0.2);
}

/* 頂部裝飾線 */
.gallery-card::before {
  content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 5px;
  background: linear-gradient(90deg, #9FB1BC, #7D9D9C); opacity: 0.8;
}

.card-body { flex: 1; display: flex; flex-direction: column; }

.card-top-row {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;
}

.type-badge {
  background: rgba(125, 157, 156, 0.1); color: var(--primary-color);
  padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
}

.status-badge {
  padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
}
.status-green { background: #E8F5E9; color: #4CAF50; }
.status-gray { background: #F5F5F5; color: #999; }

.card-title {
  margin: 0 0 20px 0; font-size: 1.3rem; color: var(--text-color); line-height: 1.4;
}

/* 數據統計區 */
.stats-container {
  display: flex; justify-content: space-around; align-items: center;
  background: #F9FAFB; padding: 15px; border-radius: 12px; margin-bottom: 20px;
}
.stat-box { display: flex; flex-direction: column; align-items: center; }
.stat-label { font-size: 0.75rem; color: #aaa; margin-bottom: 4px; text-transform: uppercase; }
.stat-value { font-size: 1.2rem; font-weight: 700; color: var(--text-color); }
.stat-value.highlight { color: var(--primary-color); }
.stat-divider { width: 1px; height: 30px; background: #E0E0E0; }

.card-meta { font-size: 0.85rem; color: #aaa; margin-bottom: 20px; text-align: center; }

.card-footer {
  margin-top: auto;
  display: flex; gap: 10px;
}

.btn-action {
  flex: 1; padding: 10px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-action.outline {
  background: transparent; border: 1px solid #ddd; color: #666;
}
.btn-action.outline:hover { border-color: var(--primary-color); color: var(--primary-color); }

.btn-action.primary {
  background: var(--primary-color); border: 1px solid var(--primary-color); color: white;
}
.btn-action.primary:hover { opacity: 0.9; box-shadow: 0 4px 10px rgba(125, 157, 156, 0.3); }

/* Loading */
.loading-area { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner {
  width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
  border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>