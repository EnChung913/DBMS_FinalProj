<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const router = useRouter();
const isLoading = ref(false);
const myResources = ref<any[]>([]);
const activeTab = ref('All');

const filteredResources = computed(() => {
  let list = activeTab.value === 'All'
    ? myResources.value
    : myResources.value.filter((r: any) => r.type === activeTab.value);

  return list.slice().sort((a: any, b: any) => {
    // 1. Cancelled 一律排最後
    const aCancelled = a.status === 'Canceled';
    const bCancelled = b.status === 'Canceled';
    if (aCancelled && !bCancelled) return 1;
    if (!aCancelled && bCancelled) return -1;

    // 2. 其他按照 deadline 排序
    // 假設 deadline 是可比較的 Date 或 timestamp
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });
});


onMounted(async () => {
  isLoading.value = true;
  try {
    const res = await apiClient.get('api/resource/my');
    myResources.value = res.data;
    // console.log(res.data);
    await new Promise(r => setTimeout(r, 300));


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

const handleReview = (id: string) => {
  router.push(`/department/resource/${id}/review`);
};

const handleStatusChange = async (resource: any, newStatus: string) => {
  try {
    await apiClient.patch(`api/resource/${resource.resource_id}/status`, { status: newStatus });
    
    console.log(`Update status of ${resource.resource_id} to ${newStatus}`);
    
    resource.status = newStatus;
    
  } catch (e) {
    alert('Update failed');
  }
};
</script>

<template>
  <div class="page-container">
    
    <div class="page-header">
      <div class="title-row">
        <button class="btn-back" @click="goBack">⮐ Back</button>
        <h1>Department Resource Management</h1>
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
    
    <div v-else class="resource-list">
      <div v-if="filteredResources.length === 0" class="empty-state">No resources found.</div>

      <div 
        v-for="res in filteredResources" 
        :key="res.resource_id" 
        class="resource-item clickable-card"
        @click="handleReview(res.resource_id)"
      >
        
        <div class="info-section">
          <div class="info-header">
            <span :class="['status-dot', res.status === 'Available' ? 'dot-green' : 'dot-gray']"></span>
            <h3 class="res-title">{{ res.title }}</h3>
            <span class="type-badge">{{ res.resource_type }}</span>
            <div class="info-meta">
                <span class="meta-date" :style="{ color: new Date(res.deadline) < new Date() ? 'red' : 'inherit' }">
                  Deadline: {{ res.deadline }}
                </span>
            </div>
          </div>
        </div>

        <div class="stats-section">
          <div class="stat-group">
            <span class="stat-label">Quota</span>
            <span class="stat-val">{{ res.quota }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-group">
            <span class="stat-label">Applicants</span>
            <span class="stat-val highlight">{{ res.applicants }}</span>
          </div>
        </div>

        <div class="action-section">
           <button class="btn-action outline" @click="handleEdit(res.resource_id)">Edit</button>
           <div class="status-changer">
             <select 
               :value="res.status" 
               @change="handleStatusChange(res, ($event.target as HTMLSelectElement).value)"
               class="select-status"
               :class="{
                 'st-avail': res.status === 'Available',
                 'st-unavail': res.status === 'Unavailable',
                 'st-canceled': res.status === 'Canceled'
               }"
             >
               <option value="Available">Available</option>
               <option value="Unavailable">Unavailable</option>
               <option value="Canceled">Canceled</option>
             </select>
           </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
@import '@/assets/main.css';

/* --- Container --- */
.page-container {
  padding: 40px 5%;
  max-width: 1200px;
  min-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.title-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 20px;
}

.title-row h1 { grid-column: 2; margin: 0; font-size: 2rem; color: var(--accent-color); }

.btn-back {
  justify-self: start;
  background: transparent; border: none; color: var(--secondary-color);
  font-size: 1rem; cursor: pointer; transition: transform 0.2s;
}
.btn-back:hover { transform: translateX(-5px); color: var(--primary-color); }

/* --- Filter Tabs --- */
.filter-bar {
  display: flex; justify-content: center; gap: 10px;
}
.filter-pill {
  background: #fff; border: 1px solid #ddd; padding: 6px 18px;
  border-radius: 20px; color: var(--text-color); cursor: pointer;
  transition: all 0.3s; font-size: 0.9rem;
}
.filter-pill.active {
  background: var(--primary-color); color: white; border-color: var(--primary-color);
  box-shadow: 0 4px 10px rgba(125, 157, 156, 0.4);
}

/* --- List Container --- */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 20px; /* 列表項目間距 */
  padding-bottom: 60px;
}

/* --- List Item Card (列表式卡片) --- */
.resource-item {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03); 
  border: 1px solid rgba(0,0,0,0.02);
  padding: 25px 30px;
  display: grid;
  /* 網格佈局：左(彈性) 中(固定) 右(固定) */
  grid-template-columns: 1fr auto auto; 
  align-items: center;
  gap: 40px;
  overflow: hidden;
  cursor: pointer; /* ✅ 讓鼠標變成手指 */
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  position: relative; /* 為了 hover 效果 */
}

.resource-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(125, 157, 156, 0.15);
  border-color: var(--primary-color); /* ✅ 懸浮時邊框變色，暗示可點擊 */
}

/* 當滑鼠移上去，且螢幕夠寬時顯示提示 */
@media (min-width: 1024px) {
  .resource-item:hover::after {
    opacity: 1;
    right: 15px;
  }
}

/* 左側裝飾線 */
.resource-item::before {
  content: ''; position: absolute; left: 0; top: 0; height: 100%; width: 5px;
  background: linear-gradient(180deg, #9FB1BC, #7D9D9C);
  opacity: 0.8;
}

/* --- Section 1: Info --- */
.info-section {
  display: flex; flex-direction: column; gap: 8px;
}

.info-header {
  display: flex; align-items: center; gap: 12px;
}

.type-badge {
  background: rgba(125, 157, 156, 0.1); color: var(--primary-color);
  padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 600;
}

.res-title {
  margin: 0; font-size: 1.25rem; color: var(--text-color); font-weight: 700;
}

.status-dot { width: 8px; height: 8px; border-radius: 50%; }
.dot-green { background-color: #4CAF50; box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2); }
.dot-gray { background-color: #ccc; }

.info-meta {
  font-size: 0.85rem; color: #888; display: flex; gap: 15px;
}

/* --- Section 2: Stats --- */
.stats-section {
  display: flex; align-items: center; gap: 20px;
  background: #F9FAFB; padding: 10px 25px; border-radius: 12px;
}

.stat-group { display: flex; flex-direction: column; align-items: center; min-width: 60px; }
.stat-label { font-size: 0.7rem; color: #aaa; text-transform: uppercase; margin-bottom: 2px; }
.stat-val { font-size: 1.2rem; font-weight: 700; color: var(--text-color); }
.stat-val.highlight { color: var(--primary-color); }
.stat-divider { width: 1px; height: 30px; background: #ddd; }

/* --- Section 3: Action --- */
.action-section {
  min-width: 100px;
}

.btn-action {
  padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;
  font-size: 0.9rem;
}
.btn-action.outline {
  background: transparent; border: 1px solid var(--primary-color); color: var(--primary-color);
}
.btn-action.outline:hover {
  background: var(--primary-color); color: white;
}

/* --- RWD --- */
@media (max-width: 768px) {
  .resource-item {
    grid-template-columns: 1fr; /* 手機版變單欄 */
    gap: 20px;
  }
  .stats-section { justify-content: space-around; width: 100%; box-sizing: border-box; }
  .action-section { width: 100%; }
}

/* Loading */
.loading-area { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner {
  width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
  border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;
}

/* Stats Section */
.stats-section {
  display: flex; align-items: center; gap: 20px;
  background: #F9FAFB; padding: 10px 25px; border-radius: 12px;
}
.stat-group { display: flex; flex-direction: column; align-items: center; min-width: 60px; }
.stat-label { font-size: 0.7rem; color: #aaa; text-transform: uppercase; margin-bottom: 2px; }
.stat-val { font-size: 1.2rem; font-weight: 700; color: var(--text-color); }
.stat-val.highlight { color: var(--primary-color); }
.stat-divider { width: 1px; height: 30px; background: #ddd; }

/* Action Section & Dropdown Styles */
.action-section { 
  display: flex; 
  gap: 10px; 
  align-items: center; 
}

.btn-action {
  padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; white-space: nowrap;
}
.btn-action.outline:hover { background: var(--primary-color); color: white; }

/* Status Changer Dropdown (小巧精緻版) */
.status-changer {
  position: relative;
}

.select-status {
  appearance: none;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 8px 30px 8px 12px; /* 右邊留空間給箭頭 */
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
  
  /* 自訂箭頭 */
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23999%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right .7em top 50%;
  background-size: .65em auto;
}

/* 根據狀態改變選單顏色 */
.select-status.st-avail { border-color: #4CAF50; color: #659568; }
.select-status.st-unavail { border-color: #ccc; color: #848382; }
.select-status.st-canceled { border-color: #f44336; color: #d17c76; }

.select-status:hover {
  filter: brightness(0.95);
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>