<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';
import type { Resource } from '@/types';
import { useStudentStore } from '@/stores/student';

const router = useRouter();
const isLoading = ref(false);
const allResources = ref<Resource[]>([]);
const activeTab = ref('All');
const student = useStudentStore();

// // --- Modal 相關狀態 (新增) ---
// const showModal = ref(false);
// const selectedResource = ref<Resource | null>(null);
// const uploadFile = ref<File | null>(null);
// const isAgreed = ref(false);
// const isSubmitting = ref(false);

// Filter
const filteredResources = computed(() => {
  const list = activeTab.value === 'All'
    ? allResources.value
    : allResources.value.filter(r => r.resource_type === activeTab.value);

  const map = new Map<string, Resource>();
  for (const r of list) {
    if (!map.has(r.resource_id)) map.set(r.resource_id, r);
  }

  const enriched = [...map.values()].map(r => {
    const e = meetsCondition(r);
    return { ...r, eligibility: e };
  });

  enriched.sort((a, b) => {
    return Number(b.eligibility.overall) - Number(a.eligibility.overall);
  });

  return enriched;
});

const meetsCondition = (r: Resource) => {
  const deptOK = r.department_id === null || r.department_id === undefined || r.department_id === student.department_id;
  const avgGpaOK = r.avg_gpa === null || r.avg_gpa === undefined || (student.avg_gpa !== null && student.avg_gpa >= r.avg_gpa);
  const currentGpaOK = r.current_gpa === null || r.current_gpa === undefined || (student.current_gpa !== null && student.current_gpa >= r.current_gpa);
  const poorOK = r.is_poor === null || r.is_poor === undefined || r.is_poor === student.is_poor;

  return {
    deptOK, avgGpaOK, currentGpaOK, poorOK,
    overall: deptOK && avgGpaOK && currentGpaOK && poorOK
  };
};

onMounted(async () => {
  isLoading.value = true;
  try {
    const res = await apiClient.get('/api/resource/list');
    allResources.value = res.data;
    
    if (!student.hasProfile) {
      const resInfo = await apiClient.get('/api/student/profile');
      const info = resInfo.data;
      student.setProfile({
        user_id: info.user.user_id,
        name: info.user.real_name,
        student_id: info.student_id,
        department_id: info.department_id,
        grade: info.grade,
        is_poor: info.is_poor,
      });
    }
    if (!student.hasGpaRecords) {
      const resGpa = await apiClient.get('/api/student/gpa');
      student.setGpaRecords(resGpa.data);
    }
    await new Promise(r => setTimeout(r, 300));
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const goBack = () => router.back();

const handleApply = (resourceId: string) => {
  router.push(`/student/apply/${resourceId}`);
};

// // --- Modal 邏輯 (新增) ---

// // 開啟 Modal
// const openApplicationModal = (resource: Resource) => {
//   selectedResource.value = resource;
//   showModal.value = true;
//   // 重置表單
//   uploadFile.value = null;
//   isAgreed.value = false;
// };

// // 關閉 Modal
// const closeModal = () => {
//   showModal.value = false;
//   selectedResource.value = null;
// };

// // 處理檔案選擇
// const handleFileChange = (event: Event) => {
//   const target = event.target as HTMLInputElement;
//   const file = target.files?.[0];
//   if (file) {
//     uploadFile.value = file;
//   }
// };

// // 送出申請
// const submitApplication = async () => {
//   console.log("submitApplication called");

//   if (!selectedResource.value) return;

//   if (!isAgreed.value) {
//     alert('Please agree to the terms to proceed.');
//     return;
//   }

//   isSubmitting.value = true;

//   try {
//     const formData = new FormData();
//     formData.append('resource_id', selectedResource.value.resource_id);

//     // 檔案是「可選」的
//     if (uploadFile.value) {
//       formData.append('file', uploadFile.value);
//     }

//     await apiClient.post('api/student/application/create', formData, {
//       headers: {
//         'Content-Type': 'multipart/form-data',
//       },
//     });

//     alert('Application submitted successfully!');
//     closeModal();
//   } catch (error: any) {
//     console.error(error);
//     const msg = error?.response?.data?.message;
//     alert(msg || 'Failed to apply.');
//   } finally {
//     isSubmitting.value = false;
//   }
// };

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
              <span v-if="res.current_gpa !== null" class="cond-pill">Current GPA ≥ {{ res.current_gpa }}</span>
              <span v-if="res.is_poor !== null" class="cond-pill">
                {{ res.is_poor ? 'Economically disadvantaged only' : 'Not limited' }}
              </span>
            </div>
          </div>          
          <p class="card-desc">{{ res.description }}</p>
          
          <div class="card-footer">
             <button 
               class="btn-explore" 
               @click="handleApply(res.resource_id)"
             >
               Apply
             </button>
          </div>
        </div>
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
.gallery-header { margin-bottom: 50px; text-align: center; }
.title-row { display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 20px; }
.btn-back { position: absolute; left: 0; background: transparent; border: none; color: var(--secondary-color); font-size: 1rem; cursor: pointer; transition: transform 0.2s; }
.btn-back:hover { transform: translateX(-5px); color: var(--primary-color); }
h1 { font-size: 2.2rem; color: var(--accent-color); letter-spacing: 1px; margin: 0; }
.filter-bar { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
.filter-pill { background: #fff; border: 1px solid #ddd; padding: 8px 20px; border-radius: 30px; color: var(--text-color); cursor: pointer; transition: all 0.3s ease; font-size: 0.95rem; box-shadow: 0 2px 5px rgba(0,0,0,0.03); }
.filter-pill.active { background: var(--primary-color); color: white; border-color: var(--primary-color); box-shadow: 0 4px 12px rgba(125, 157, 156, 0.4); }
.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; row-gap: 80px; padding-bottom: 60px; }
@media (max-width: 1024px) { .gallery-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .gallery-grid { grid-template-columns: 1fr; } }
.gallery-card { background: #fff; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); display: flex; flex-direction: column; height: 100%; border: 1px solid rgba(0,0,0,0.02); padding: 25px; position: relative; overflow: hidden; }
.gallery-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(125, 157, 156, 0.15); border-color: rgba(125, 157, 156, 0.2); }
.gallery-card::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 5px; background: linear-gradient(90deg, #9FB1BC, #7D9D9C); opacity: 0.8; }
.card-body { flex: 1; display: flex; flex-direction: column; }
.card-top-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.type-badge { background: rgba(125, 157, 156, 0.1); color: var(--primary-color); padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; letter-spacing: 0.5px; }
.match-badge { background: #FDF2F2; color: #D98C8C; padding: 5px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 700; }
.match-badge.eligible { background: #ECFDF5; color: #059669; }
.match-badge.not-eligible { background: #FDF2F2; color: #D98C8C; }
.card-title { margin: 0 0 10px 0; font-size: 1.35rem; color: var(--text-color); line-height: 1.3; font-weight: 700; }
.card-meta { display: flex; flex-direction: column; gap: 6px; font-size: 0.9rem; color: #888; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #f5f5f5; }
.card-desc { font-size: 0.95rem; color: #666; line-height: 1.6; margin-bottom: 30px; flex: 1; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.card-footer { margin-top: auto; }
.btn-explore { width: 100%; padding: 12px; background: transparent; border: 1px solid var(--primary-color); color: var(--primary-color); border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-explore:hover { background: var(--primary-color); color: white; box-shadow: 0 4px 12px rgba(125, 157, 156, 0.2); }
.loading-area { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color); border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.card-conditions { margin-top: 0.5rem; font-size: 0.85rem; }
.cond-label { font-weight: 600; margin-bottom: 0.25rem; }
.cond-list { display: flex; flex-wrap: wrap; gap: 0.25rem; }
.cond-pill { padding: 0.15rem 0.5rem; border-radius: 999px; border: 1px solid #ddd; font-size: 0.8rem; }
</style>