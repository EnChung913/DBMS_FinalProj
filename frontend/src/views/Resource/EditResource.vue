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
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/resource/:id
    // ----------------------------------------------------------------
    // const res = await apiClient.get(`/resource/${resourceId}`);
    // formData.value = res.data;
    
    // --- Mock Data ---
    console.log(`[Mock] Fetching resource ID: ${resourceId}`);
    await new Promise(r => setTimeout(r, 800));
    
    formData.value = {
      title: isCompany ? 'Frontend Engineer Intern' : '好棒棒獎學金',
      resource_type: isCompany ? 'Internship' : 'Scholarship',
      quota: 3,
      deadline: '2025-06-30',
      description: '這是一個模擬的回填描述內容...\n\n我們正在尋找熱情的夥伴加入我們！'
    };
    // -----------------

  } catch (error) {
    console.error(error);
    alert('Cannot fetch resource data. Returning to previous page.');
    router.back();
  } finally {
    isFetching.value = false;
  }
});

// 送出更新
const handleSubmit = async () => {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // ----------------------------------------------------------------
    // TO DO: [PATCH] /api/resource/:id
    // ----------------------------------------------------------------
    // await apiClient.patch(`/resource/${resourceId}`, formData.value);

    // Mock
    console.log(`[Mock] Updating ID ${resourceId}`, formData.value);
    await new Promise(r => setTimeout(r, 1000));

    alert('Update successful!');
    if (isCompany) router.push('/company/dashboard');
    else router.push('/department/dashboard');

  } catch (error: any) {
    console.error(error);
    alert('Update failed. Please check the fields and try again.');
  } finally {
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

.header-icon {
  font-size: 2rem;
  opacity: 0.8;
  background: #f5f5f5;
  width: 50px; height: 50px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
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
</style>