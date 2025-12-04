<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const router = useRouter();
const isLoading = ref(false);
const applications = ref<any[]>([]);
const activeTab = ref('All');

// 篩選邏輯
const filteredApps = computed(() => {
  if (activeTab.value === 'All') return applications.value;
  // 簡單篩選：可根據需求調整，這裡假設 tab 對應 status
  return applications.value.filter(app => app.status === activeTab.value.toLowerCase());
});

onMounted(async () => {
  isLoading.value = true;
  try {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/company/applications
    // ----------------------------------------------------------------
    // const res = await apiClient.get('/company/applications');
    // applications.value = res.data;

    // --- Mock Data ---
    await new Promise(r => setTimeout(r, 600));
    applications.value = [
      { 
        id: 'a1', applicant: 'Alex Chen', job_title: 'Frontend Engineer Intern', 
        gpa: 3.9, date: '2025-02-24', status: 'submitted', school: 'NTU - CS'
      },
      { 
        id: 'a2', applicant: 'Betty Wu', job_title: 'Frontend Engineer Intern', 
        gpa: 4.1, date: '2025-02-21', status: 'reviewed', school: 'NCCU - MIS'
      },
      { 
        id: 'a3', applicant: 'Charlie Lin', job_title: 'Backend Developer', 
        gpa: 3.5, date: '2025-02-20', status: 'interview', school: 'NTHU - CS'
      },
      { 
        id: 'a4', applicant: 'David Wang', job_title: 'UI/UX Designer', 
        gpa: 3.8, date: '2025-02-18', status: 'rejected', school: 'NTUST - Design'
      },
      { 
        id: 'a5', applicant: 'Eva Chang', job_title: 'Product Manager', 
        gpa: 4.0, date: '2025-02-15', status: 'hired', school: 'NTU - BA'
      }
    ];

  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const goBack = () => router.back();

const getStatusClass = (status: string) => {
  switch (status) {
    case 'hired': return 'status-green';
    case 'rejected': return 'status-red';
    case 'interview': return 'status-purple';
    case 'reviewed': return 'status-blue';
    default: return 'status-gray'; // submitted
  }
};

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    submitted: '未審閱',
    reviewed: '已審閱',
    interview: '面試中',
    hired: '已錄取',
    rejected: '未錄取'
  };
  return map[status] || status;
};

const handleReview = (id: string) => {
  // TODO: 導向詳細審閱頁面 or 開啟 Modal
  alert(`Reviewing applicant ${id}`);
};
</script>

<template>
  <div class="gallery-container">
    
    <div class="gallery-header">
      <div class="title-row">
        <button class="btn-back" @click="goBack">⮐ Back</button>
        <h1>Company Applicant Review</h1>
      </div>
      
      <div class="filter-bar">
        <button 
          v-for="tab in ['All', 'Submitted', 'Interview', 'Hired', 'Rejected']" 
          :key="tab"
          :class="['filter-pill', { active: activeTab === tab || (activeTab === 'All' && tab === 'All') }]"
          @click="activeTab = tab.toLowerCase() === 'all' ? 'All' : tab.toLowerCase()"
        >
          {{ tab }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading-area">
      <div class="spinner"></div>
      <p>Loading applicants...</p>
    </div>
    
    <div v-else class="gallery-grid">
      <div v-for="app in filteredApps" :key="app.id" class="gallery-card">
        
        <div class="card-body">
          
          <div class="card-top-row">
            <span :class="['status-badge', getStatusClass(app.status)]">
              {{ getStatusLabel(app.status) }}
            </span>
            <span class="date-text">{{ app.date }}</span>
          </div>

          <h3 class="card-title">
            <span class="avatar">{{ app.applicant.charAt(0) }}</span>
            {{ app.applicant }}
          </h3>
          
          <div class="card-meta">
            <span class="job-label">Applied for:</span>
            <span class="job-value">{{ app.job_title }}</span>
          </div>

          <div class="stats-container">
            <div class="stat-box">
              <span class="stat-label">GPA</span>
              <span class="stat-value highlight">{{ app.gpa }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-box">
              <span class="stat-label">School</span>
              <span class="stat-value small-text">{{ app.school }}</span>
            </div>
          </div>
          
          <div class="card-footer">
             <button class="btn-action primary" @click="handleReview(app.id)">Approve</button>
          </div>
        </div>
        
      </div>
    </div>

  </div>
</template>

<style scoped>
@import '@/assets/main.css';

/* --- Container & Header (一致風格) --- */
.gallery-container {
  padding: 40px 5%;
  min-width: 1200px;
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

/* --- Application Card --- */
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

.date-text { font-size: 0.85rem; color: #aaa; }

.status-badge {
  padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;
}
.status-green { background: #E8F5E9; color: #4CAF50; }
.status-red { background: #FFEBEE; color: #EF5350; }
.status-blue { background: #E3F2FD; color: #42A5F5; }
.status-purple { background: #F3E5F5; color: #AB47BC; }
.status-gray { background: #F5F5F5; color: #999; }

.card-title {
  margin: 0 0 10px 0; font-size: 1.4rem; color: var(--text-color);
  display: flex; align-items: center; gap: 10px;
}

.avatar {
  width: 32px; height: 32px; background: var(--input-bg); color: var(--secondary-color);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 1rem; font-weight: 600;
}

.card-meta {
  margin-bottom: 20px; font-size: 0.95rem; color: #666;
}
.job-label { color: #aaa; margin-right: 5px; font-size: 0.85rem; }
.job-value { font-weight: 500; color: var(--primary-color); }

/* 數據區塊 */
.stats-container {
  display: flex; justify-content: space-around; align-items: center;
  background: #F9FAFB; padding: 15px; border-radius: 12px; margin-bottom: 25px;
}
.stat-box { display: flex; flex-direction: column; align-items: center; text-align: center; }
.stat-label { font-size: 0.75rem; color: #aaa; margin-bottom: 4px; text-transform: uppercase; }
.stat-value { font-size: 1.2rem; font-weight: 700; color: var(--text-color); }
.stat-value.highlight { color: var(--primary-color); }
.stat-value.small-text { font-size: 0.95rem; font-weight: 500; }
.stat-divider { width: 1px; height: 30px; background: #E0E0E0; }

.card-footer {
  margin-top: auto;
}

.btn-action {
  width: 100%; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.btn-action.primary {
  background: var(--primary-color); border: 1px solid var(--primary-color); color: white;
}
.btn-action.primary:hover { opacity: 0.9; box-shadow: 0 4px 12px rgba(125, 157, 156, 0.3); }

/* Loading */
.loading-area { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner {
  width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
  border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>