<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const formData = ref({
  title: '',
  resource_type: '', 
  quota: 1,
  deadline: '',
  description: ''
});

const isCompany = authStore.role === 'company';
const pageTitle = isCompany ? '發布職缺 (Publish Job)' : '發布資源 (Publish Resource)';

const resourceTypes = isCompany 
  ? [
      { value: 'Internship', label: '實習 (Internship)' },
      { value: 'Others', label: '其他 (Others)' }
    ]
  : [
      { value: 'Scholarship', label: '獎學金 (Scholarship)' },
      { value: 'Lab', label: '實驗室/專題 (Lab)' },
      { value: 'Internship', label: '校內實習 (Internship)' },
      { value: 'Others', label: '其他 (Others)' }
    ];

const handleSubmit = async () => {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // ----------------------------------------------------------------
    // [POST] /api/resource/create
    // ----------------------------------------------------------------
    await apiClient.post('/resource/create', formData.value);

    // Mock Data
    // await new Promise(r => setTimeout(r, 800));

    alert('發布成功！');
    
    if (isCompany) router.push('/company/dashboard');
    else router.push('/department/dashboard');

  } catch (error: any) {
    console.error(error);
    alert('發布失敗，請檢查欄位是否完整。');
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
        <span class="icon">⮐</span> Back
      </button>
    </div>

    <div class="card form-card">
      
      <div class="card-header">
        <h2>{{ pageTitle }}</h2>
      </div>

      <form @submit.prevent="handleSubmit">
        
        <div class="form-group">
          <label>標題 (Title)</label>
          <input 
            v-model="formData.title" 
            type="text" 
            required 
            placeholder="例如：2025 暑期實習生 / 清寒獎學金"
          />
        </div>

        <div class="row">
          <div class="form-group col">
            <label>類型 (Type)</label>
            <select v-model="formData.resource_type" required>
              <option value="" disabled>請選擇類型</option>
              <option v-for="opt in resourceTypes" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="form-group col">
            <label>名額 (Quota)</label>
            <input 
              v-model="formData.quota" 
              type="number" 
              min="1" 
              required 
            />
          </div>
        </div>

        <div class="form-group">
          <label>截止日期 (Deadline)</label>
          <input 
            v-model="formData.deadline" 
            type="date" 
            required 
          />
        </div>

        <div class="form-group">
          <label>詳細描述 (Description)</label>
          <textarea 
            v-model="formData.description" 
            rows="6" 
            required 
            placeholder="請輸入詳細的工作內容、申請資格或實驗室介紹..."
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn-primary-large" :disabled="isLoading">
            {{ isLoading ? '發布中...' : '確認發布' }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/main.css';

.page-container {
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column; /* 垂直排列 */
  align-items: center;    /* 水平置中 */
}

/* ✅ 新增：外部標題列樣式 */
.outer-header {
  width: 100%;
  max-width: 700px; /* 跟卡片同寬，讓按鈕對齊卡片左邊 */
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

/* ✅ 新增：外部返回按鈕樣式 */
.btn-back-outer {
  background: transparent;
  border: none;
  color: var(--secondary-color);
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  transition: all 0.2s;
}

.btn-back-outer:hover {
  color: var(--primary-color);
  transform: translateX(-5px); /* 懸浮時往左動一下 */
}

.btn-back-outer .icon {
  font-size: 1.3rem;
  line-height: 1;
}

/* 卡片樣式 */
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

.card-header {
  margin-bottom: 30px;
  text-align: center;
  border-bottom: 1px solid #f5f5f5; /* 加一條底線區隔 */
  padding-bottom: 20px;
}

.card-header h2 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.8rem;
}

/* Form Styles (保持原本設定) */
.row {
  display: flex;
  gap: 20px;
}
.col { flex: 1; }

.form-group { margin-bottom: 20px; }

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.95rem;
}

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

.form-actions {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

.btn-primary-large {
  width: 100%;
  padding: 14px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(125, 157, 156, 0.3);
}

.btn-primary-large:hover {
  background-color: var(--accent-color);
  transform: translateY(-2px);
}

.btn-primary-large:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>