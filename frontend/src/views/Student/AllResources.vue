<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';
import type { Resource } from '@/types';

const router = useRouter();
const isLoading = ref(false);
const allResources = ref<Resource[]>([]);
const activeTab = ref('All');

// 篩選邏輯
const filteredResources = computed(() => {
  if (activeTab.value === 'All') return allResources.value;
  return allResources.value.filter(r => r.resource_type === activeTab.value);
});

onMounted(async () => {
  isLoading.value = true;
  try {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/student/resources
    // ----------------------------------------------------------------
    // const res = await apiClient.get('/student/resources');
    // allResources.value = res.data;

    // --- Mock Data ---
    await new Promise(r => setTimeout(r, 500));
    allResources.value = [
      { 
        resource_id: 'r1', title: 'Software Engineer Intern', resource_type: 'Internship', 
        quota: 5, description: 'Python/Vue.js required. Join us to build the future of finance.', deadline: '2025-05-30', status: 'Available', 
        supplier_name: 'TSMC', match_score: 98
      },
      { 
        resource_id: 'r2', title: 'Lab Research Assistant', resource_type: 'Lab', 
        quota: 2, description: 'Quantum Computing Lab research project focusing on error correction.', deadline: '2025-06-01', status: 'Available',
        supplier_name: 'Prof. Chang', match_score: 88
      },
      { 
        resource_id: 'r3', title: 'Merit Scholarship 2025', resource_type: 'Scholarship', 
        quota: 10, description: 'For top 5% students with outstanding academic performance.', deadline: '2025-04-15', status: 'Available',
        supplier_name: 'Academic Office', match_score: 45
      },
      { 
        resource_id: 'r4', title: 'UI/UX Designer Intern', resource_type: 'Internship', 
        quota: 1, description: 'Figma skills needed. Help us redesign our mobile app experience.', deadline: '2025-05-20', status: 'Available',
        supplier_name: 'Line Taiwan', match_score: 70
      },
      { 
        resource_id: 'r5', title: 'Exchange Program - Japan', resource_type: 'Others', 
        quota: 3, description: 'Semester exchange to Tokyo Univ. N2 required.', deadline: '2025-03-01', status: 'Available',
        supplier_name: 'Intl. Office', match_score: 30
      },
      { 
        resource_id: 'r6', title: 'Data Analyst Intern', resource_type: 'Internship', 
        quota: 2, description: 'SQL & Tableau expertise needed.', deadline: '2025-06-15', status: 'Available',
        supplier_name: 'Shopee', match_score: 65
      }
    ];
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const goBack = () => router.back();
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
    
    <div v-else class="gallery-grid">
      <div v-for="res in filteredResources" :key="res.resource_id" class="gallery-card">
        
        <div class="card-body">
          
          <div class="card-top-row">
            <span class="type-badge">{{ res.resource_type }}</span>
            <span v-if="res.match_score && res.match_score > 80" class="match-badge">
              {{ res.match_score }}% Match
            </span>
          </div>

          <h3 class="card-title">{{ res.title }}</h3>
          
          <div class="card-meta">
            <span class="supplier">🏢 {{ res.supplier_name }}</span>
            <span class="deadline">📅 {{ res.deadline }}</span>
          </div>
          
          <p class="card-desc">{{ res.description }}</p>
          
          <div class="card-footer">
             <button class="btn-explore">Explore Details</button>
          </div>
        </div>
        
      </div>
    </div>

  </div>
</template>

<style scoped>
@import '@/assets/main.css';

/* --- Container --- */
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
.btn-back:hover { transform: translateX(-5px); color: var(--primary-color); }

h1 {
  font-size: 2.2rem;
  color: var(--accent-color);
  letter-spacing: 1px;
  margin: 0;
}

/* --- Filter Pills --- */
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
  box-shadow: 0 2px 5px rgba(0,0,0,0.03);
}

.filter-pill.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.4);
}

/* --- Gallery Grid (關鍵：強制三欄) --- */
.gallery-grid {
  display: grid;
  /* ✅ 強制 3 欄 (1fr 1fr 1fr)
     不管螢幕多大，只要裝得下就是三欄 
  */
  grid-template-columns: repeat(3, 1fr); 
  
  gap: 30px;        /* 水平間距 */
  row-gap: 80px;    /* 垂直間距 */
  
  padding-bottom: 60px;
}

/* 響應式：平板變 2 欄 */
@media (max-width: 1024px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
}

/* 響應式：手機變 1 欄 */
@media (max-width: 600px) {
  .gallery-grid { grid-template-columns: 1fr; }
}

/* --- Gallery Card (Clean Style) --- */
.gallery-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03); 
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  height: 100%; /* 確保等高 */
  border: 1px solid rgba(0,0,0,0.02);
  padding: 25px; /* 內距 */
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
  height: 5px; /* 線條厚度 */
  background: linear-gradient(90deg, #9FB1BC, #7D9D9C); /* 莫蘭迪漸層 */
  opacity: 0.8;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 標籤列 */
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
  background: #FDF2F2; 
  color: #D98C8C;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
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
  flex-direction: column; /* 改為垂直排列比較整齊 */
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
  flex: 1; /* 讓文字撐開高度 */
  
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

/* Loading */
.loading-area {
  text-align: center;
  padding: 60px;
  color: var(--secondary-color);
}
.spinner {
  width: 40px; height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>