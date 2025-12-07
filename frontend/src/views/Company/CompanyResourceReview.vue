<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const route = useRoute();
const router = useRouter();
const resourceId = route.params.id as string;

// 資料
const resourceInfo = ref<any>({});
const applicants = ref<any[]>([]);
const selectedIds = ref<Set<string>>(new Set());
const isLoading = ref(false);
const activeTab = ref('All'); 

// 篩選邏輯
const filteredApplicants = computed(() => {
  if (activeTab.value === 'All') return applicants.value;
  return applicants.value.filter(a => a.status === activeTab.value.toLowerCase());
});

const isAllSelected = computed(() => {
  const list = filteredApplicants.value;
  return list.length > 0 && list.every(a => selectedIds.value.has(a.id));
});

const toggleAll = (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked;
  if (checked) {
    filteredApplicants.value.forEach(a => selectedIds.value.add(a.id));
  } else {
    filteredApplicants.value.forEach(a => selectedIds.value.delete(a.id));
  }
};

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id);
  else selectedIds.value.add(id);
};

onMounted(async () => {
  isLoading.value = true;
  try {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/company/resource/:id/applicants
    // ----------------------------------------------------------------
    await new Promise(r => setTimeout(r, 600)); // Mock

    resourceInfo.value = {
      title: 'Frontend Engineer Intern (Vue.js)',
      type: 'Internship',
      quota: 3,
      total_applicants: 15,
      deadline: '2025-06-30'
    };

    applicants.value = [
      { id: 'a1', student_name: '王小明', student_id: 'B09901001', school: 'NTU - CS', gpa: 3.9, status: 'approved', date: '2025-02-24' },
      { id: 'a2', student_name: '陳小美', student_id: 'B09901023', school: 'NCCU - MIS', gpa: 4.1, status: 'approved', date: '2025-02-23' },
      { id: 'a3', student_name: '林大華', student_id: 'B09901055', school: 'NTHU - CS', gpa: 3.5, status: 'rejected', date: '2025-02-20' },
      { id: 'a4', student_name: '張偉', student_id: 'B09901066', school: 'NTUST - Design', gpa: 4.0, status: 'Pending', date: '2025-02-18' },
      { id: 'a5', student_name: '李四', student_id: 'B09901077', school: 'NYCU - CS', gpa: 3.8, status: 'approved', date: '2025-02-22' },
    ];
  } catch (error) { console.error(error); } finally { isLoading.value = false; }
});

const processSelection = async (decision: 'approved' | 'rejected') => {
  if (selectedIds.value.size === 0) return;
  if (!confirm(`Confirm to mark ${selectedIds.value.size} applicants as ${decision.toUpperCase()}?`)) return;

  try {
    // TO DO: [POST] /api/company/application/batch-review
    console.log(`[Mock] Batch ${decision}:`, [...selectedIds.value]);
    applicants.value.forEach(a => {
      if (selectedIds.value.has(a.id)) a.status = decision;
    });
    selectedIds.value.clear();
    alert('Processed successfully!');
  } catch (e) { alert('Failed to process'); }
};

const goBack = () => router.back();

const getStatusClass = (status: string) => {
  switch(status) {
    case 'approved': return 'status-green';
    case 'rejected': return 'status-red';
    default: return 'status-blue'; // pending
  }
};
</script>

<template>
  <div class="page-container">
    
    <div class="header-section">
      <button class="btn-back" @click="goBack">⮐ Back</button>
      
      <div class="resource-summary-card">
        <div class="summary-left">
          <span class="type-tag">{{ resourceInfo.type }}</span>
          <h2 class="res-title">{{ resourceInfo.title }}</h2>
          <span class="deadline-text">Deadline: {{ resourceInfo.deadline }}</span>
        </div>
        <div class="summary-right">
          <div class="stat-bubble">
            <span class="val">{{ resourceInfo.quota }}</span>
            <span class="lbl">Quata</span>
          </div>
          <div class="stat-bubble highlight">
            <span class="val">{{ applicants.length }}</span>
            <span class="lbl">Applicants</span>
          </div>
        </div>
      </div>
    </div>

    <div class="tabs-row">
      <button 
        v-for="tab in ['All', 'Pending', 'Approved', 'Rejected']" 
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab }}
        <span class="count-badge">{{ 
          tab === 'All' ? applicants.length : applicants.filter(a => a.status === tab.toLowerCase()).length 
        }}</span>
      </button>
    </div>

    <div v-if="isLoading" class="loading-area">Loading...</div>

    <div v-else class="table-card">
      <table class="review-table">
        <thead>
          <tr>
            <th width="50">
              <input type="checkbox" :checked="isAllSelected" @change="toggleAll" class="custom-checkbox header-cb" />
            </th>
            <th>Student name(ID)</th>
            <th>Department</th>
            <th>GPA</th>
            <th>Applied Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredApplicants.length === 0">
            <td colspan="7" class="empty-row">No eligible applicants</td>
          </tr>
          <tr 
            v-for="app in filteredApplicants" 
            :key="app.id" 
            :class="{ 'selected-row': selectedIds.has(app.id) }"
            @click="toggleSelect(app.id)"
          >
            <td @click.stop>
              <input 
                type="checkbox" 
                :checked="selectedIds.has(app.id)" 
                @change="toggleSelect(app.id)"
                class="custom-checkbox" 
              />
            </td>
            <td>
              <div class="student-info">
                <div class="avatar">{{ app.student_name.charAt(0) }}</div>
                <div class="text">
                  <span class="name">{{ app.student_name }}</span>
                  <span class="sid">{{ app.student_id }}</span>
                </div>
              </div>
            </td>
            <td>{{ app.school }}</td>
            <td>
              <span :class="['gpa-badge', app.gpa >= 4.0 ? 'high' : '']">{{ app.gpa }}</span>
            </td>
            <td class="date-cell">{{ app.date }}</td>
            <td>
              <span :class="['status-pill', getStatusClass(app.status)]">
                {{ app.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <transition name="slide-up">
      <div v-if="selectedIds.size > 0" class="floating-bar">
        <div class="bar-content">
          <span class="selection-info">Selected <strong>{{ selectedIds.size }}</strong> applicants</span>
          <div class="bar-actions">
            <button class="btn-bar reject" @click="processSelection('rejected')">
              <span class="icon">✕</span> Reject
            </button>
            <button class="btn-bar approve" @click="processSelection('approved')">
              <span class="icon">✓</span> Approve
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
@import '@/assets/main.css';

.page-container {
  padding: 40px 5%;
  min-width: 900px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  padding-bottom: 100px; /* 留空間給 Floating Bar */
}

/* --- Header & Resource Summary --- */
.header-section { margin-bottom: 30px; }

.btn-back {
  background: transparent; border: none; color: var(--secondary-color);
  font-size: 1rem; cursor: pointer; margin-bottom: 15px; font-weight: 500;
  transition: color 0.2s;
}
.btn-back:hover { color: var(--primary-color); }

.resource-summary-card {
  background: linear-gradient(135deg, #fff 0%, #fcfcfc 100%);
  border-radius: 20px;
  padding: 30px 75px;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
  gap: 50px;
}

.summary-left { display: flex; flex-direction: column; gap: 10px; }
.type-tag { 
  background: rgba(125, 157, 156, 0.1); color: var(--primary-color); 
  padding: 4px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; align-self: flex-start;
}
.res-title { margin: 0; font-size: 1.8rem; color: var(--text-color); }
.deadline-text { color: #888; font-size: 0.9rem; }

.summary-right { display: flex; gap: 30px; }
.stat-bubble { text-align: center; }
.stat-bubble .val { display: block; font-size: 1.8rem; font-weight: 700; color: var(--text-color); line-height: 1; }
.stat-bubble .lbl { font-size: 0.8rem; color: #aaa; text-transform: uppercase; margin-top: 5px; }
.stat-bubble.highlight .val { color: var(--primary-color); }

/* --- Tabs --- */
.tabs-row { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 1px; }
.tab-btn {
  background: transparent; border: none; padding: 10px 20px;
  font-size: 1rem; color: #888; cursor: pointer; position: relative;
  border-bottom: 2px solid transparent; transition: all 0.2s;
  display: flex; align-items: center; gap: 8px;
}
.tab-btn:hover { color: var(--primary-color); }
.tab-btn.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }
.count-badge { background: #f0f0f0; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; color: #666; }
.tab-btn.active .count-badge { background: var(--primary-color); color: white; }

/* --- Table Card --- */
.table-card {
  background: #fff; border-radius: 16px; 
  box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);
  overflow: hidden;
}

.review-table { width: 100%; border-collapse: collapse; }
.review-table th { 
  text-align: left; padding: 18px 24px; background: #F9FAFB; 
  color: var(--secondary-color); font-size: 0.85rem; font-weight: 600; letter-spacing: 0.5px;
  border-bottom: 1px solid #eee;
}
.review-table td { 
  padding: 18px 24px; border-bottom: 1px solid #f5f5f5; vertical-align: middle; 
  color: var(--text-color); cursor: pointer;
}
.review-table tr:last-child td { border-bottom: none; }
.review-table tr:hover { background-color: #fafafa; }
.review-table tr.selected-row { background-color: rgba(125, 157, 156, 0.05); }

.empty-row { text-align: center; padding: 40px; color: #aaa; }

/* Student Cell */
.student-info { display: flex; align-items: center; gap: 12px; }
.avatar { 
  width: 36px; height: 36px; border-radius: 50%; background: #EBEBE8; 
  display: flex; align-items: center; justify-content: center; 
  font-weight: 600; color: var(--secondary-color); font-size: 0.9rem;
}
.student-info .text { display: flex; flex-direction: column; }
.name { font-weight: 600; font-size: 0.95rem; }
.sid { font-size: 0.8rem; color: #999; }

/* GPA */
.gpa-badge { font-weight: 600; color: #555; }
.gpa-badge.high { color: var(--primary-color); background: rgba(125, 157, 156, 0.1); padding: 2px 6px; border-radius: 4px; }

/* Status Pill */
.status-pill { padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; text-transform: capitalize; }
.status-green { background: #E8F5E9; color: #93bb95; }
.status-red { background: #FFEBEE; color: #d99999; }
.status-blue { background: #E3F2FD; color: #7796d8; }

.btn-text { background: transparent; border: none; color: var(--primary-color); cursor: pointer; font-weight: 500; }
.btn-text:hover { text-decoration: underline; }

/* Checkbox */
.custom-checkbox { width: 18px; height: 18px; accent-color: var(--primary-color); cursor: pointer; }

/* --- Floating Action Bar --- */
.floating-bar {
  position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
  z-index: 100;
}
.bar-content {
  background: #333; color: white; padding: 12px 24px; border-radius: 50px;
  display: flex; align-items: center; gap: 40px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.25);
}
.selection-info { font-weight: 600; font-size: 0.95rem; }
.bar-actions { display: flex; gap: 10px; }

.btn-bar {
  padding: 8px 20px; border-radius: 20px; border: none; font-weight: 600; 
  cursor: pointer; display: flex; align-items: center; gap: 6px; transition: transform 0.2s;
}
.btn-bar:hover { transform: translateY(-2px); }
.btn-bar.approve { background: #4CAF50; color: white; }
.btn-bar.reject { background: #EF5350; color: white; }

/* Transition */
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translate(-50%, 20px); }

.loading-area { text-align: center; padding: 60px; color: #aaa; }
</style>