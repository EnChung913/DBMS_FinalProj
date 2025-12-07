<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/axios';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const isLoading = ref(false);
const isFetching = ref(true);

// 取得 URL 參數中的 ID
const resourceId = route.params.id as string;

// 表單資料
const formData = ref({
  title: '',
  resource_type: '',
  quota: 1,
  deadline: '',
  description: ''
});

interface Condition {
  department_id: string; // Empty string means 'All Departments'
  avg_gpa?: number;
  current_gpa?: number;
  is_poor?: boolean;
}
const conditions = ref<Condition[]>([]);
// 模擬系所選項 (實際應從後端取得)
const departmentOptions = ref<any[]>([]);

// 判斷角色，顯示對應的標題與選項
const isCompany = authStore.role === 'company';
const pageTitle = isCompany ? 'Edit Company Resource' : 'Edit Department Resource';
const pageSubtitle = 'Update Detail Information';

const resourceTypes = isCompany 
  ? [
      { value: 'Internship', label: 'Internship' },
      { value: 'Full-time', label: 'Full-time' },
      { value: 'Others', label: 'Others' }
    ]
  : [
      { value: 'Scholarship', label: 'Scholarship' },
      { value: 'Lab', label: 'Lab' },
      { value: 'Internship', label: 'Internship' },
      { value: 'Others', label: 'Others' }
    ];

// 初始化：取得現有資料
onMounted(async () => {
  try {
    const res = await apiClient.get(`api/resource/${resourceId}`);
    formData.value = res.data;
    
    console.log(`Fetching resource ID: ${resourceId}`);
    await new Promise(r => setTimeout(r, 800));
    
    formData.value = {
      title: isCompany ? 'Frontend Engineer Intern' : '好棒棒獎學金',
      resource_type: isCompany ? 'Internship' : 'Scholarship',
      quota: 3,
      deadline: '2025-06-30',
      description: '這是一個模擬的回填描述內容...\n\n我們正在尋找熱情的夥伴加入我們！'
    };
    addCondition();

  } catch (error) {
    console.error(error);
    alert('Cannot fetch resource data. Returning to previous page.');
    router.back();
  } finally {
    isFetching.value = false;
  }
});

const addCondition = () => {
  conditions.value.push({
    department_id: '',
    avg_gpa: undefined,
    current_gpa: undefined,
    is_poor: false
  });
};

const removeCondition = (index: number) => {
  conditions.value.splice(index, 1);
};

const handleSubmit = async () => {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // 1. 建立資源
    const res = await apiClient.post('/resource/create', formData.value);
    const resourceId = res.data.resource_id || 'mock-id'; // 確保後端回傳 ID

    // 2. 建立條件 (逐筆新增)
    // 雖然效率較差，但符合目前的 API 設計 (addCondition)
    for (const cond of conditions.value) {
      // 過濾空值
      const payload: any = { ...cond };
      if (!payload.department_id) delete payload.department_id; // 後端若接受 undefined 代表全校
      
      // TODO: [POST] /resource/:id/condition
      await apiClient.post(`/resource/${resourceId}/condition`, payload);
    }

    alert('Upload sucess!');
    if (isCompany) router.push('/company/dashboard');
    else router.push('/department/dashboard');
  } catch (error: any) {
    console.error(error);
    alert('Upload failed')
    isLoading.value = false;
  }
};

const goBack = () => router.back();
</script>

<template>
  <div class="page-container">
    
    <div class="outer-header">
      <button class="btn-back-outer" @click="goBack">
        <span class="icon">⮐ </span>Back
      </button>
    </div>

    <div v-if="isFetching" class="loading-wrapper">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-else class="form-card">
      
      <div class="card-header">
        <div class="header-content">
          <h2>{{ pageTitle }}</h2>
          <span class="subtitle">{{ pageSubtitle }}</span>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="main-form">
        
        <div class="form-group">
          <label>Title</label>
          <input v-model="formData.title" type="text" />
        </div>

        <div class="row">
          <div class="form-group col">
            <label>Type</label>
            <div class="select-wrapper">
              <select v-model="formData.resource_type" required>
                <option v-for="opt in resourceTypes" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span class="arrow">▼</span>
            </div>
          </div>

          <div class="form-group col">
            <label>Quota</label>
            <input v-model="formData.quota" type="number" min="1" required />
          </div>
        </div>

        <div class="form-group">
          <label>Deadline</label>
          <input v-model="formData.deadline" type="date" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea 
            v-model="formData.description" 
            rows="8" 
            required
            placeholder="Provide detailed information about the resource here..."
          ></textarea>
        </div>

        <hr class="divider" />

        <div class="form-section">
          <div class="section-head-row">
            <label>Eligibility Conditions</label>
            <button type="button" class="btn-add-cond" @click="addCondition">+ New rules</button>
          </div>
          <p class="hint-text">You can set multiple sets of rules. Students can apply if they meet any set of rules.</p>

          <div v-for="(cond, index) in conditions" :key="index" class="condition-box">
            <div class="cond-header">
              <span class="cond-index">Rule #{{ index + 1 }}</span>
              <button type="button" class="btn-remove" @click="removeCondition(index)" v-if="conditions.length > 1">Remove</button>
            </div>
            
            <div class="row">
              <div class="form-group col">
                <label>Department</label>
                <select v-model="cond.department_id">
                  <option value="">All Departments</option>
                  <option v-for="dept in departmentOptions" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                  </option>
                </select>
              </div>
              
              <div class="form-group col">
                <label>Low Income</label>
                <div class="checkbox-wrapper">
                  <input class="" type="checkbox" v-model="cond.is_poor" :id="`poor-${index}`" />
                  <label :for="`poor-${index}`" class="inline-label">限清寒學生</label>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="form-group col">
                <label>Min Avg GPA</label>
                <input v-model.number="cond.avg_gpa" type="number" step="0.1" min="0" max="4.3" placeholder="Unrestricted" />
              </div>
              <div class="form-group col">
                <label>Min Current GPA</label>
                <input v-model.number="cond.current_gpa" type="number" step="0.1" min="0" max="4.3" placeholder="Unrestricted" />
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="goBack">Cancel</button>
          <button type="submit" class="btn-primary-gradient" :disabled="isLoading">
            {{ isLoading ? 'Saving...' : 'Saved' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/main.css';

/* 背景與容器 */
.page-container {
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 外部 Header */
.outer-header {
  width: 100%;
  max-width: 720px;
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

.btn-back-outer {
  background: transparent;
  border: none;
  color: var(--secondary-color);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.btn-back-outer:hover { 
  background: rgba(0,0,0,0.03);
  color: var(--primary-color); 
  transform: translateX(-3px); 
}

/* Form Card - 精緻卡片 */
.form-card {
  width: 100%;
  max-width: 700px;
  min-width: 700px;
  background: #fff;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Card Header */
.card-header {
  background: linear-gradient(135deg, #fff 0%, #fcfcfc 100%);
  padding: 30px 40px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-content h2 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.8rem;
}

.subtitle {
  color: #999;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Form Body */
.main-form {
  padding: 40px;
}

.row { display: flex; gap: 25px; }
.col { flex: 1; }
.form-group { margin-bottom: 25px; }

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.95rem;
}

/* 輸入框優化 */
input, select, textarea {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #E0E0E0;
  border-radius: 10px;
  font-size: 1rem;
  background: #FAFAFA;
  transition: all 0.3s;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  background: #FFF;
  box-shadow: 0 0 0 3px rgba(125, 157, 156, 0.1);
}

textarea { resize: vertical; }

/* 自訂 Select 箭頭 */
.select-wrapper { position: relative; }
.select-wrapper select { appearance: none; cursor: pointer; }
.select-wrapper .arrow {
  position: absolute; right: 15px; top: 50%; transform: translateY(-50%);
  font-size: 0.7rem; color: #888; pointer-events: none;
}

/* Form Actions */
.form-actions {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #ddd;
  color: #666;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover { background: #f5f5f5; color: #333; }

.btn-primary-gradient {
  background: linear-gradient(135deg, var(--primary-color) 0%, #6b8c8b 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(125, 157, 156, 0.3);
}

.btn-primary-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(125, 157, 156, 0.4);
}

.btn-primary-gradient:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Loading State */
.loading-wrapper {
  text-align: center;
  padding: 80px 0;
  color: var(--secondary-color);
}
.spinner {
  width: 40px; height: 40px;
  border: 3px solid #f0f0f0;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Section & Condition Styles */
.divider { border: 0; border-top: 1px solid #eee; margin: 30px 0; }
.section-title { font-size: 1.1rem; color: var(--text-color); margin: 0; font-weight: 700; border-left: 4px solid var(--primary-color); padding-left: 10px; }
.section-head-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.hint-text { font-size: 0.85rem; color: #888; margin-bottom: 20px; }

.condition-box {
  background: #F9FAFB; border: 1px solid #eee; border-radius: 12px; padding: 20px; margin-bottom: 15px;
  transition: all 0.2s;
}
.condition-box:hover { border-color: var(--primary-color); box-shadow: 0 4px 10px rgba(0,0,0,0.03); }

.cond-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.cond-index { font-weight: 700; color: var(--accent-color); font-size: 0.9rem; }
.btn-remove { background: transparent; border: 1px solid #ffcdd2; color: #d32f2f; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
.btn-remove:hover { background: #ffebee; }

.btn-add-cond { background: transparent; border: 1px dashed var(--primary-color); color: var(--primary-color); padding: 6px 12px; border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
.btn-add-cond:hover { background: rgba(125, 157, 156, 0.1); }

.checkbox-wrapper { display: flex; justify-content: flex-start; align-items: center; gap: 8px; height: 100%; }
.inline-label { margin: 0; font-weight: normal; cursor: pointer; }.checkbox-wrapper {
  display: flex;
  align-items: center; /* 垂直置中 */
  gap: 15px;
  padding-left: 5px;
  min-height: 48px; 
}

/* 確保 Checkbox 本身沒有多餘邊距 */
.checkbox-wrapper input[type="checkbox"] {
  margin: 0; 
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.inline-label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-color);
  user-select: none;
  
  /* (選用) 如果覺得字太鬆，可以微調行高 */
  line-height: 1.2; 
}
</style>