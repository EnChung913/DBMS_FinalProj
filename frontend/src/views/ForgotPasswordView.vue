<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const router = useRouter();
const email = ref('');
const isLoading = ref(false);
const isSent = ref(false); // 控制是否顯示「發送成功」畫面

const handleReset = async () => {
  if (isLoading.value) return;
  isLoading.value = true;

  try {
    // ----------------------------------------------------------------
    // TO DO: [POST] /api/auth/forgot-password
    // Payload: { email: string }
    // ----------------------------------------------------------------
    
    // await apiClient.post('/auth/forgot-password', { email: email.value });
    
    // --- Mock Data ---
    console.log(`[Mock] Sending reset link to ${email.value}`);
    await new Promise(r => setTimeout(r, 1000));
    // -----------------

    isSent.value = true; // 切換到成功畫面

  } catch (error) {
    console.error(error);
    alert('Failed to send reset link. Please check your email.');
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <div class="container">
    <h2>Reset Password</h2>
    
    <div v-if="!isSent">
      <p style="text-align: center; color: #666; font-size: 0.9rem; margin-bottom: 20px;">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <form @submit.prevent="handleReset">
        <div class="form-group">
          <label>Email Address</label>
          <input 
            v-model="email" 
            type="email" 
            required 
            placeholder="example@ntu.edu.tw"
          />
        </div>
        
        <button type="submit" class="btn-primary" :disabled="isLoading">
          {{ isLoading ? 'Sending...' : 'Send Reset Link' }}
        </button>
      </form>
    </div>

    <div v-else style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 10px;">📩</div>
      <h3 style="color: var(--primary-color); margin: 0 0 10px 0;">Check your email</h3>
      <p style="color: #666; font-size: 0.9rem; margin-bottom: 20px;">
        We have sent a password reset link to <strong>{{ email }}</strong>.
      </p>
      <button class="btn-primary" @click="router.push('/login')">
        Back to Login
      </button>
    </div>

    <div class="link-text">
      <router-link to="/login">Back to Login</router-link>
    </div>
  </div>
</template>