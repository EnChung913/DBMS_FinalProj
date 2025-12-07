<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/axios';
import { useStudentStore } from '@/stores/student';

const route = useRoute();
const router = useRouter();

const resourceId = route.params.id as string;
const resource = ref<any>(null); // Store the full resource object
const isLoading = ref(false);
const isSubmitting = ref(false);
const uploadFile = ref<File | null>(null);
const isAgreed = ref(false);
const student = useStudentStore();

onMounted(async () => {
  isLoading.value = true;
  try {
    // Fetch the specific resource details
    // TO DO: [GET] /api/resource/:id
    // const res = await apiClient.get(`/api/resource/${resourceId}`);
    // resource.value = res.data;

    // --- Mock Data ---
    await new Promise(r => setTimeout(r, 300));
    resource.value = {
      resource_id: resourceId,
      title: 'Software Engineer Intern (TSMC)',
      resource_type: 'Internship',
      quota: 5,
      deadline: '2025-05-30',
      description: 'Join us to build the future of semiconductor technology. Python/Vue.js required.',
      supplier_name: 'TSMC'
    };
    // -----------------

    // Fetch profile if needed (similar to StudentDashboard logic)
    if (!student.hasProfile) {
      // const resInfo = await apiClient.get('/api/student/profile');
      // student.setProfile(resInfo.data);
    }
  } catch (error) {
    console.error(error);
    alert('Failed to load resource details.');
    router.back();
  } finally {
    isLoading.value = false;
  }
});

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    uploadFile.value = target.files[0] || null;
  }
};

const handleSubmit = async () => {
  if (!isAgreed.value) {
    alert('Please agree to the terms.');
    return;
  }
  isSubmitting.value = true;

  try {
    // ----------------------------------------------------------------
    // TO DO: [POST] /api/student/application
    // Use FormData for file upload
    // ----------------------------------------------------------------
    
    // const formData = new FormData();
    // formData.append('resource_id', resourceId);
    // if (uploadFile.value) formData.append('file', uploadFile.value);
    // await apiClient.post('/student/application', formData);

    // --- Mock Data ---
    console.log(`[Mock] Applying for ${resourceId}, File: ${uploadFile.value?.name}`);
    await new Promise(r => setTimeout(r, 1000));
    // -----------------

    alert('Application submitted successfully!');
    router.push('/student/applications'); 

  } catch (error) {
    console.error(error);
    alert('Application failed.');
  } finally {
    isSubmitting.value = false;
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
        <div class="header-content">
          <h2>Apply for Resource</h2>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">Loading details...</div>

      <form v-else @submit.prevent="handleSubmit" class="main-form">
        
        <div class="form-group">
          <label>Title</label>
          <div class="subtitle">{{ resource?.title }}</div>
        </div>
        <div class="form-group">
          <label>Type</label>
          <div class="subtitle">{{ resource?.resource_type }}</div>
        </div>
        <div class="form-group">
          <label>Supplier</label>
          <div class="subtitle">{{ resource?.supplier_name }}</div>
        </div>
        <div class="form-group">
          <label>Quota</label>
          <div class="subtitle">{{ resource?.quota }}</div>
        </div>
        <div class="form-group">
          <label>Deadline</label>
          <div class="subtitle">{{ resource?.deadline }}</div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <div class="subtitle desc-text">{{ resource?.description }}</div>
        </div>

        <hr class="divider" />

        <div class="form-group">
          <label>Upload Files (Resume / Transcript)</label>
          <div class="file-input-wrapper">
            <input type="file" @change="handleFileUpload" class="custom-file-input" />
            <div class="file-fake-display">
              {{ uploadFile ? uploadFile.name : 'Click to choose files (PDF, Word)' }}
            </div>
          </div>
        </div>

        <div class="form-group checkbox-row">
          <input type="checkbox" id="agree" v-model="isAgreed" class="custom-checkbox">
          <label for="agree" class="checkbox-label">
            I confirm that the information is correct and I agree to the terms.
          </label>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="goBack">Cancel</button>
          <button 
            type="submit" 
            class="btn-primary-gradient" 
            :disabled="!isAgreed || isSubmitting"
          >
            {{ isSubmitting ? 'Submitting...' : 'Submit Application' }}
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

/* Form Card */
.form-card {
  width: 100%;
  max-width: 700px;
  background: #fff;
  padding: 0; /* Let internal padding handle spacing */
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.03);
  border: 1px solid rgba(0,0,0,0.02);
  overflow: hidden;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

/* Card Header */
.card-header {
  background: linear-gradient(135deg, #fff 0%, #fcfcfc 100%);
  padding: 30px 40px;
  border-bottom: 1px solid #f0f0f0;
}

.header-content h2 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.8rem;
}

/* Main Form */
.main-form {
  padding: 40px;
}

.form-group { margin-bottom: 25px; }

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-weight: 600;
  font-size: 0.95rem;
}

.subtitle {
  font-size: 1rem;
  color: #e7e7e7;
  padding: 10px 15px;
  background:var(--accent-color);
  border-radius: 8px;
  border: 1px solid #eee;
}

.desc-text {
  min-height: 80px;
  white-space: pre-wrap;
}

.divider {
  border: 0;
  border-top: 1px solid #eee;
  margin: 30px 0;
}

/* File Upload */
.file-input-wrapper {
  position: relative;
  width: 100%;
}
.custom-file-input {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  opacity: 0; cursor: pointer;
}
.file-fake-display {
  width: 100%;
  padding: 14px 16px;
  border: 2px dashed #e0e0e0; 
  border-radius: 12px;
  font-size: 1rem;
  background: #fafafa;
  color: #888;
  text-align: center;
  transition: all 0.2s;
  box-sizing: border-box;
}
.file-input-wrapper:hover .file-fake-display {
  border-color: var(--primary-color);
  background: #fff;
  color: var(--primary-color);
}

/* Checkbox */
.checkbox-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(125, 157, 156, 0.05); 
  padding: 15px;
  border-radius: 12px;
  margin-top: 10px;
}
.custom-checkbox {
  width: 20px; height: 20px; accent-color: var(--primary-color); cursor: pointer;
}
.checkbox-label {
  margin: 0; font-weight: 500; font-size: 0.95rem; color: #555; cursor: pointer;
}

/* Actions */
.form-actions {
  margin-top: 40px;
  padding-top: 20px;
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

.loading-state {
  text-align: center;
  padding: 50px;
  color: #888;
}
</style>