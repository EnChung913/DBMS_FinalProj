<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const router = useRouter();
const isLoading = ref(false);

const formData = ref({
  title: '',
  category: '',
  description: '',
  proof_link: '' // 用來存放證明連結 (如 Google Drive)
});

const categories = [
  'Competition',
  'Research',
  'Service',
  'Certification',
  'Others'
];

const handleSubmit = async () => {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // ----------------------------------------------------------------
    // TO DO: [POST] /api/student/achievement
    // ----------------------------------------------------------------
    // await apiClient.post('/student/achievement', formData.value);

    // --- Mock Data ---
    console.log('[Mock] Uploading Achievement:', formData.value);
    await new Promise(r => setTimeout(r, 800));
    // -----------------

    alert('上傳成功！等待系所審核。');
    router.push('/student/dashboard');

  } catch (error) {
    console.error(error);
    alert('上傳失敗，請稍後再試。');
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

    <div class="form-card">
      <div class="card-header">
        <h2>Upload Achievement</h2>
      </div>

      <form @submit.prevent="handleSubmit" class="main-form">
        
        <div class="form-group">
          <label>Title</label>
          <input 
            v-model="formData.title" 
            type="text" 
            required 
            placeholder="e.g., 2023 ACM ICPC Asia Regional Contest" 
          />
        </div>

        <div class="form-group">
          <label>Category</label>
          <div class="select-wrapper">
            <select v-model="formData.category" required>
              <option v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Proof Link</label>
          <input 
            v-model="formData.proof_link" 
            type="url" 
            required 
            placeholder="https://drive.google.com/..." 
          />
          <small class="hint">Please provide a cloud link (Google Drive, Dropbox) and grant viewing permissions.</small>
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea 
            v-model="formData.description" 
            rows="5" 
            required
            placeholder="Briefly describe your achievement..."
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="goBack">Cancel</button>
          <button type="submit" class="btn-primary-gradient" :disabled="isLoading">
            {{ isLoading ? 'Uploading...' : 'Upload' }}
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
  flex-direction: column; 
  align-items: center;  
}

.outer-header {
  width: 100%;
  max-width: 700px; 
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

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
  transform: translateX(-5px); 
}

.btn-back-outer .icon {
  font-size: 1.3rem;
  line-height: 1;
}

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

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.card-header {
  background: linear-gradient(135deg, #fff 0%, #fcfcfc 100%);
  padding: 30px 40px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
}
.card-header h2 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.8rem;
}

.subtitle { color: #999; font-size: 0.9rem; font-weight: 500; }

.main-form { padding: 40px; }
.form-group { margin-bottom: 25px; }

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

.hint { display: block; margin-top: 6px; font-size: 0.8rem; color: #aaa; }

.form-actions {
  margin-top: 40px; padding-top: 30px; border-top: 1px solid #f5f5f5;
  display: flex; justify-content: flex-end; gap: 15px;
}

.btn-cancel {
  background: transparent; border: 1px solid #ddd; color: #666;
  padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer;
}
.btn-cancel:hover { background: #f5f5f5; }

.btn-primary-gradient {
  background: linear-gradient(135deg, var(--primary-color) 0%, #6b8c8b 100%);
  color: white; border: none; padding: 12px 30px;
  border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 15px rgba(125, 157, 156, 0.3);
}
.btn-primary-gradient:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(125, 157, 156, 0.4); }
</style>