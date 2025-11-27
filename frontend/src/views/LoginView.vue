<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/api/axios';
import type { AuthResponse } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const credentials = ref({ username: '', password: '' });

const handleLogin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // ----------------------------------------------------------------
    // TODO: [POST] /api/auth/login
    // 請後端完成後，解開下方註解，並移除 Mock Data 區塊
    // ----------------------------------------------------------------
    
    /* const response = await apiClient.post<AuthResponse>('/auth/login', credentials.value);
    const data = response.data;
    */

    // --- Mock Data Start (模擬後端回傳) ---
    console.log('[Mock] Logging in with:', credentials.value);
    await new Promise(r => setTimeout(r, 800)); // 假裝讀取中

    const mockUserRole = credentials.value.username.includes('admin') ? 'department' : 'student';
    
    const data: AuthResponse = {
      success: true,
      access_token: 'mock_token_' + Date.now(),
      user: {
        user_id: 'u1',
        username: credentials.value.username,
        real_name: 'Mock User',
        role: mockUserRole as any,
        is_setup_done: true // 改成 false 可測試 ProfileSetup 流程
      }
    };
    // --- Mock Data End ---

    if (data.success) {
      authStore.setAuth(data.access_token, data.user);

      if (!data.user.is_setup_done) {
        router.push('/setup-profile');
      } else {
        switch (data.user.role) {
          case 'department': router.push('/department/dashboard'); break;
          case 'company': router.push('/company/dashboard'); break;
          default: router.push('/student/dashboard');
        }
      }
    }
  } catch (error: any) {
    console.error(error);
    alert('Login failed');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="container">
     <h2>Welcome Back</h2>
     <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Username</label>
          <input v-model="credentials.username" required placeholder="admin for dept, other for student"/>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="credentials.password" type="password" required />
        </div>
        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Logging in...' : 'Login' }}
        </button>
     </form>
     <div class="link-text">
       No account? <router-link to="/register">Register</router-link>
     </div>
  </div>
</template>