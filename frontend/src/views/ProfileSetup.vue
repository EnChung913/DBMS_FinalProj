<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/api/axios';

const router = useRouter();
const authStore = useAuthStore();
const userRole = computed(() => authStore.role || 'student');

// 下拉選單資料
const departments = ref<{id: string, name: string}[]>([]);

onMounted(async () => {
  if (userRole.value === 'student') {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/common/departments (取得系所列表)
    // ----------------------------------------------------------------
    
    // Mock Data
    departments.value = [
      { id: 'd1', name: 'Computer Science' },
      { id: 'd2', name: 'Business Administration' },
      { id: 'd3', name: 'Design' }
    ];
  }
});

const profileData = ref({
  student_id: '', department_id: '', entry_year: new Date().getFullYear(), grade: 1,
  department_name: '', company_name: '', industry: ''
});

const titleMap: Record<string, string> = {
  student: 'Student Profile',
  department: 'Department Profile',
  company: 'Company Profile'
};
const pageTitle = computed(() => titleMap[userRole.value] || 'Profile Setup');

const handleSubmit = async () => {
  try {
    let payload = {};
    let endpoint = '';

    if (userRole.value === 'student') {
      endpoint = '/student/profile';
      payload = { 
        student_id: profileData.value.student_id,
        department_id: profileData.value.department_id,
        entry_year: profileData.value.entry_year,
        grade: profileData.value.grade
      };
    } else if (userRole.value === 'department') {
      endpoint = '/department/profile';
      payload = { department_name: profileData.value.department_name };
    } else {
      endpoint = '/company/profile';
      payload = { company_name: profileData.value.company_name, industry: profileData.value.industry };
    }

    // ----------------------------------------------------------------
    // TO DO: [POST] {endpoint}
    // ----------------------------------------------------------------
    // await apiClient.post(endpoint, payload);
    console.log(`[Mock] POST ${endpoint}`, payload);
    
    // 更新狀態
    authStore.updateSetupStatus(true);
    alert('Profile setup complete!');

    // 導向
    if (userRole.value === 'student') router.push('/student/dashboard');
    else if (userRole.value === 'department') router.push('/department/dashboard');
    else router.push('/company/dashboard');

  } catch (error) {
    alert('Failed to update profile');
  }
};
</script>

<template>
  <div class="container">
    <h2>{{ pageTitle }}</h2>
    <form @submit.prevent="handleSubmit">
      
      <template v-if="userRole === 'student'">
        <div class="form-group">
          <label>Student ID</label>
          <input v-model="profileData.student_id" required />
        </div>
        <div class="form-group">
          <label>Department</label>
          <select v-model="profileData.department_id" required>
            <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Entry Year / Grade</label>
          <div style="display:flex; gap:10px;">
            <input v-model="profileData.entry_year" type="number" placeholder="Year" />
            <input v-model="profileData.grade" type="number" placeholder="Grade" />
          </div>
        </div>
      </template>

      <template v-if="userRole === 'department'">
        <div class="form-group">
          <label>Department Name</label>
          <input v-model="profileData.department_name" required />
        </div>
      </template>

      <template v-if="userRole === 'company'">
        <div class="form-group">
          <label>Company Name</label>
          <input v-model="profileData.company_name" required />
        </div>
        <div class="form-group">
          <label>Industry</label>
          <input v-model="profileData.industry" required />
        </div>
      </template>

      <button type="submit" class="btn-primary">Save & Continue</button>
    </form>
  </div>
</template>