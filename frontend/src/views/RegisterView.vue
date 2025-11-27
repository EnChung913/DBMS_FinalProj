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
  real_name: '', email: '', username: '', password: '', nickname: '', role: 'student' as UserRole
});

const handleRegister = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  
  try {
    // ----------------------------------------------------------------
    // TODO: [POST] /api/auth/register
    // ----------------------------------------------------------------
    
    /*
    const response = await apiClient.post<AuthResponse>('/auth/register', formData.value);
    const data = response.data;
    */

    // --- Mock Data Start ---
    console.log('[Mock] Registering:', formData.value);
    await new Promise(r => setTimeout(r, 800));

    const data: AuthResponse = {
      success: true,
      access_token: 'mock_token_' + Date.now(),
      user: {
        user_id: 'u_new',
        username: formData.value.username,
        real_name: formData.value.real_name,
        role: formData.value.role,
        is_setup_done: false // 註冊後通常需要設定 Profile
      }
    };
    // --- Mock Data End ---
    
    if (data.success) {
      authStore.setAuth(data.access_token, data.user);
      alert('Registration successful!');
      router.push('/setup-profile');
    }
  } catch (error: any) {
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