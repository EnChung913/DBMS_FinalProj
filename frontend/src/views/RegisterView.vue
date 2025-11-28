<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/api/axios';
import type { AuthResponse, UserRole } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

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

    console.log('Need profile setup:', data.needProfile);

    // 註冊後一定要做 profile
    if (data.needProfile) {
      router.push('/setup-profile');
      return;
    }

  } catch (error: any) {
    console.error(error);
    alert('Registration failed');
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
        <label>Password</label>
        <input v-model="formData.password" type="password" required />
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