<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/api/axios';
import type { AuthResponse } from '@/types';

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const credentials = ref({
  identifier: '',
  password: '',
});

const handleLogin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  
  try {
    // ---- 真實後端 API 呼叫 ----
    const response = await apiClient.post<AuthResponse>(
      '/api/auth/login',     
      credentials.value,
      { withCredentials: true } // with credentials
    );

    const data = response.data;
    console.log('status:', response.status);
    console.log('Login successful:', data);

    authStore.setUser(data.user);
    authStore.setNeedProfile(data.needProfile);

    console.log('Need profile setup:', data.needProfile);
    if (data.needProfile) {
      router.push('/setup-profile');
      return;
    }

    console.log('User role:', data.user.role);
    switch (data.user.role) {
      case 'admin':
        router.push('/admin/dashboard');
        break;
      case 'department':
        router.push('/department/dashboard');
        break;
      case 'company':
        router.push('/company/dashboard');
        break;
      default:
        router.push('/student/dashboard');
    }
  } catch (error: any) {
    console.error(error);
    console.log('login error response:', error.response?.data);
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
        <label>Identifier</label>
        <input
          v-model="credentials.identifier"
          required
          placeholder="Your student ID or login ID"
        />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input v-model="credentials.password" type="password" required />
        <div style="text-align: right; margin-top: 5px;">
         <router-link to="/forgot-password" style="font-size: 0.8rem; color: #888; text-decoration: none;">
          Forgot Password ?
         </router-link>
        </div>
      </div>

      <button
        type="submit"
        class="btn-primary"
        :disabled="isLoading"
      >
        {{ isLoading ? 'Logging in...' : 'Login' }}
      </button>
    </form>

    <div class="link-text">
      No account?
      <router-link to="/register">Register</router-link>
    </div>
  </div>
</template>
