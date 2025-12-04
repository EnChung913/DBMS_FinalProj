<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';
import type { AppStatus } from '@/types';

const router = useRouter();
const isLoading = ref(false);

// 定義申請紀錄的介面
interface MyApplication {
  application_id: string;
  resource_id: string;
  resource_title: string;
  supplier_name: string;
  apply_date: string;
  status: AppStatus;
}

const applications = ref<MyApplication[]>([]);

onMounted(async () => {
  isLoading.value = true;
  try {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/student/applications
    // ----------------------------------------------------------------
    // const res = await apiClient.get('/student/applications');
    // applications.value = res.data;

    // --- Mock Data ---
    await new Promise(r => setTimeout(r, 600));
    applications.value = [
      {
        application_id: 'a1', resource_id: 'r1',
        resource_title: 'Software Engineer Intern',
        supplier_name: 'TSMC',
        apply_date: '2025-02-24',
        status: 'submitted'
      },
      {
        application_id: 'a2', resource_id: 'r2',
        resource_title: 'Lab Research Assistant',
        supplier_name: 'Prof. Chang (Quantum Lab)',
        apply_date: '2025-02-10',
        status: 'under_review'
      },
      {
        application_id: 'a3', resource_id: 'r3',
        resource_title: 'Merit Scholarship 2024',
        supplier_name: 'Academic Office',
        apply_date: '2024-11-15',
        status: 'approved'
      },
      {
        application_id: 'a4', resource_id: 'r5',
        resource_title: 'Exchange Program - USA',
        supplier_name: 'Intl. Office',
        apply_date: '2024-10-01',
        status: 'rejected'
      },
      {
        application_id: 'a5', resource_id: 'r6',
        resource_title: 'Data Analyst Intern',
        supplier_name: 'Shopee',
        apply_date: '2024-09-20',
        status: 'rejected'
      }
    ];
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    submitted: '已送出',
    under_review: '審核中',
    approved: '已錄取',
    rejected: '未錄取'
  };
  return map[status] || status;
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'approved': return 'status-green';
    case 'rejected': return 'status-red';
    case 'under_review': return 'status-blue';
    default: return 'status-gray'; // submitted
  }
};

const handleCancel = (appId: string) => {
  if(confirm('Are you sure you want to cancel this application?')) {
    console.log('Cancel application:', appId);
    // TODO: Call API
    applications.value = applications.value.filter(a => a.application_id !== appId);
  }
};

const goBack = () => router.back();
</script>

<template>
  <div class="gallery-container">
    
    <div class="gallery-header">
      <div class="title-row">
        <button class="btn-back" @click="goBack">⮐ Back</button>
        <h1>My Applications</h1>
      </div>
    </div>

    <div v-if="isLoading" class="loading-area">
      <div class="spinner"></div>
      <p>Loading applications...</p>
    </div>

    <div v-else class="gallery-grid">
      <div v-if="applications.length === 0" class="empty-state">
        <p>You haven't applied for anything yet.</p>
        <router-link to="/student/resources" class="link-explore">Explore Resources</router-link>
      </div>

      <div v-for="app in applications" :key="app.application_id" class="gallery-card">
        
        <div class="card-body">
          
          <div class="card-top-row">
            <span :class="['status-badge', getStatusClass(app.status)]">
              {{ getStatusLabel(app.status) }}
            </span>
            <span class="date-badge">📅 {{ app.apply_date }}</span>
          </div>

          <h3 class="card-title">{{ app.resource_title }}</h3>
          
          <div class="card-meta">
            <span class="supplier">🏢 {{ app.supplier_name }}</span>
          </div>
          
          <div class="card-footer">
             <button 
               v-if="app.status === 'submitted'" 
               class="btn-cancel" 
               @click="handleCancel(app.application_id)"
             >
               Cancel Application
             </button>
             
             <button v-else class="btn-disabled" disabled>
               {{ app.status === 'approved' ? 'Success 🎉' : 'Closed' }}
             </button>
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
  min-width: 1200px;
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

/* --- Gallery Grid (強制三欄) --- */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); 
  gap: 30px;
  row-gap: 80px;
  padding-bottom: 60px;
}

@media (max-width: 1024px) {
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .gallery-grid { grid-template-columns: 1fr; }
}

/* --- Gallery Card (一致風格) --- */
.gallery-card {
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03); 
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid rgba(0,0,0,0.02);
  padding: 25px;
  position: relative;
  overflow: hidden;
}

.gallery-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(125, 157, 156, 0.15);
  border-color: rgba(125, 157, 156, 0.2);
}

/* 頂部裝飾線 */
.gallery-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 5px;
  background: linear-gradient(90deg, #9FB1BC, #7D9D9C);
  opacity: 0.8;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 頂部資訊列 */
.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.status-badge {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* 狀態顏色 */
.status-gray { background: #F0F2F5; color: #7D8CA3; }
.status-blue { background: #E3F2FD; color: #42A5F5; }
.status-green { background: #E8F5E9; color: #66BB6A; }
.status-red { background: #FFEBEE; color: #EF5350; }

.date-badge {
  font-size: 0.8rem;
  color: #aaa;
}

.card-title {
  margin: 0 0 10px 0;
  font-size: 1.3rem;
  color: var(--text-color);
  line-height: 1.3;
  font-weight: 700;
}

.card-meta {
  margin-bottom: 30px;
  font-size: 0.9rem;
  color: #888;
  flex: 1; /* 撐開高度 */
}

.card-footer {
  margin-top: auto;
}

/* Buttons */
.btn-cancel {
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 1px solid #FFCDD2;
  color: #EF5350;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background: #FFEBEE;
}

.btn-disabled {
  width: 100%;
  padding: 12px;
  background: #F5F5F5;
  border: none;
  color: #BBB;
  border-radius: 8px;
  font-weight: 600;
  cursor: default;
}

/* Loading & Empty */
.loading-area { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner {
  width: 40px; height: 40px;
  border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
  border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.empty-state { text-align: center; color: #aaa; padding: 50px; grid-column: 1 / -1; }
.link-explore { color: var(--primary-color); font-weight: 600; text-decoration: none; margin-left: 5px; }
</style>