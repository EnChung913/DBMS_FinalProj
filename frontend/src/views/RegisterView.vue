<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/api/axios';
import type { AuthResponse, UserRole } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const confirmPassword = ref('');

const formData = ref({
  real_name: '',
  email: '',
  username: '',
  password: '',
  nickname: '',
  role: 'student' as UserRole
});

const handleRegister = async () => {
  if (isLoading.value) return;

  // 確認密碼
  if (formData.value.password !== confirmPassword.value) {
    alert('Passwords do not match');
    return;
  }

  isLoading.value = true;
  console.log('Sending payload:', JSON.stringify(formData.value, null, 2));

  try {
    // ---- 呼叫後端註冊 API ----
    const response = await apiClient.post<AuthResponse>(
      '/api/auth/register',
      formData.value,
      { withCredentials: true }
    );

    const data = response.data;
    console.log('status:', response.status);
    console.log('Registration success:', data);

    // 設定 user
    authStore.setUser(data.user);
    console.log("user: ", data.user); 

    authStore.setNeedProfile(null); // 重設 needProfile 狀態
    console.log('Need profile setup:', data.needProfile);

    // 註冊後一定要做 profile
    if (authStore.role == 'student' && data.needProfile) {
      router.push('/setup-profile');
      return;
    }
    else if (authStore.role === 'department') {
      router.push('/department/dashboard');
      return;
    }    
    else if (authStore.role === 'company') {
      router.push('/company/dashboard');
      return;
    }

  } catch (error: any) {
    // ✅ 擷取並顯示後端錯誤
    if (error.response && error.response.status === 400) {
      const backendError = error.response.data;
      
      console.error('Backend Validation Error Object:', backendError);

      if (backendError.message && Array.isArray(backendError.message)) {
        // 顯示 DTO 驗證失敗的詳細列表（通常會將所有錯誤訊息組合成陣列）
        alert(`Registration Failed (Validation): ${backendError.message.join('; ')}`);
      } else {
        // 顯示一般錯誤（例如唯一性約束違反）
        alert(`Registration Failed: ${backendError.message || 'Check your password or username/email.'}`);
      }
    } else {
      alert('Registration failed due to a server error.');
    }
  } finally {
    isLoading.value = false;
  }
};
</script>


<template>
  <div class="container">
    <h2>Create Account</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label>Real Name</label>
        <input v-model="formData.real_name" required />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input v-model="formData.email" type="email" required />
      </div>
      <div class="form-group">
        <label>Username</label>
        <input v-model="formData.username" required />
      </div>
      <div class="form-group">
        <label>Nickname</label>
        <input v-model="formData.nickname" required />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input v-model="formData.password" type="password" required />
      </div>
      <div class="form-group">
        <label>Confirm Password</label>
        <input 
          v-model="confirmPassword" 
          type="password" 
          required 
          placeholder="Re-enter your password"
          :class="{ 'error-border': confirmPassword && formData.password !== confirmPassword }"
        />
        <small v-if="confirmPassword && formData.password !== confirmPassword" style="color: var(--error-color);">
          Passwords do not match
        </small>
      </div>
      <div class="form-group">
        <label>Role</label>
        <select v-model="formData.role">
          <option value="student">Student</option>
          <option value="department">Department</option>
          <option value="company">Company</option>
        </select>
      </div>
      <button type="submit" class="btn-primary" :disabled="isLoading">Register</button>
    </form>
    <div class="link-text">
      Already have an account? <router-link to="/login">Log in</router-link>
    </div>
  </div>
</template>

<style scoped>
.error-border {
  border: 1px solid var(--error-color);
}
</style>