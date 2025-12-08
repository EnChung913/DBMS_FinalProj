<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios'; // 請確保這是設定好 Base URL 的 axios instance

const router = useRouter();

// 流程狀態: 1.輸入Email -> 2.驗證2FA -> 3.設定新密碼 -> 4.成功
const step = ref<1 | 2 | 3 | 4>(1);
const isLoading = ref(false);
const errorMsg = ref('');

// 資料暫存
const email = ref('');
const verificationCode = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const resetToken = ref(''); // 用於保存通過 2FA 驗證後取得的臨時 Token

/**
 * Step 1: 檢查 Email 並確認用戶開啟了 2FA
 * API: POST /auth/forgot-password/check
 */
const handleCheckEmail = async () => {
  if (!email.value) {
    errorMsg.value = 'Please enter your email address.';
    return;
  }
  
  isLoading.value = true;
  errorMsg.value = '';

  try {
    // [修改] 正式呼叫後端 API
    // 注意：路徑取決於你的 axios baseURL 設定，若 baseURL 已包含 /api，則這裡寫 /auth/...
    await apiClient.post('api/auth/forgot-password/check', { 
      email: email.value 
    });
    
    // 若無噴錯，代表 User 存在且有開啟 2FA
    step.value = 2; 
  } catch (err: any) {
    console.error(err);
    // 顯示後端回傳的錯誤訊息，若無則顯示預設訊息
    errorMsg.value = err.response?.data?.message || 'Email not found or 2FA is not enabled.';
  } finally {
    isLoading.value = false;
  }
};

/**
 * Step 2: 驗證 6 位數代碼
 * API: POST /auth/forgot-password/verify-2fa
 */
const handleVerifyCode = async () => {
  if (verificationCode.value.length !== 6) {
    errorMsg.value = 'Please enter a valid 6-digit code.';
    return;
  }

  isLoading.value = true;
  errorMsg.value = '';

  try {
    // [修改] 正式呼叫後端 API
    const res = await apiClient.post('api/auth/forgot-password/verify-2fa', { 
      email: email.value, 
      code: verificationCode.value 
    });

    // 重要：後端驗證通過後會回傳一個暫時的 Token (效期短，專用於重設密碼)
    resetToken.value = res.data.token;

    step.value = 3; // 進入重設密碼步驟
  } catch (err: any) {
    console.error(err);
    errorMsg.value = err.response?.data?.message || 'Invalid code. Please try again.';
  } finally {
    isLoading.value = false;
  }
};

/**
 * Step 3: 送出新密碼
 * API: POST /auth/forgot-password/reset
 */
const handleResetPassword = async () => {
  if (newPassword.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters.';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.';
    return;
  }

  isLoading.value = true;
  errorMsg.value = '';

  try {
    // [修改] 正式呼叫後端 API，帶上 Token 與新密碼
    await apiClient.post('api/auth/forgot-password/reset', {
      token: resetToken.value,
      newPassword: newPassword.value
    });

    step.value = 4; // 顯示成功畫面
  } catch (err: any) {
    console.error(err);
    errorMsg.value = err.response?.data?.message || 'Failed to reset password. Token may have expired.';
  } finally {
    isLoading.value = false;
  }
};

const goBackToLogin = () => {
  router.push('/login');
};
</script>
<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      
      <header class="card-header">
        <div class="icon-wrapper">
          <span v-if="step === 4">✅</span>
          <span v-else-if="step === 3">🔐</span>
          <span v-else-if="step === 2">🛡️</span>
          <span v-else>🔑</span>
        </div>
        <h2>
          <span v-if="step === 1">Reset Password</span>
          <span v-else-if="step === 2">Security Verification</span>
          <span v-else-if="step === 3">Create New Password</span>
          <span v-else>Password Changed!</span>
        </h2>
      </header>

      <div v-if="errorMsg" class="error-banner">
        {{ errorMsg }}
      </div>

      <div v-if="step === 1" class="step-content">
        <p class="description">
          Enter your account email. We will verify your identity using your Two-Factor Authentication (2FA) app.
        </p>
        <div class="input-group">
          <input 
            v-model="email" 
            type="email" 
            placeholder="example@ntu.edu.tw" 
            class="std-input"
            @keyup.enter="handleCheckEmail"
          />
        </div>
        <button class="btn-primary" @click="handleCheckEmail" :disabled="isLoading">
          {{ isLoading ? 'Checking...' : 'Next' }}
        </button>
        <button class="btn-text" @click="goBackToLogin">Back to Login</button>
      </div>

      <div v-else-if="step === 2" class="step-content">
        <p class="description">
          Please enter the 6-digit code from your Google Authenticator app.
        </p>
        <div class="input-group">
          <input 
            v-model="verificationCode" 
            type="text" 
            maxlength="6" 
            placeholder="000 000" 
            class="code-input"
            @keyup.enter="handleVerifyCode"
          />
        </div>
        <button class="btn-primary" @click="handleVerifyCode" :disabled="isLoading">
          {{ isLoading ? 'Verifying...' : 'Verify' }}
        </button>
        <button class="btn-secondary" @click="step = 1" :disabled="isLoading">
          Back
        </button>
      </div>

      <div v-else-if="step === 3" class="step-content">
        <p class="description">
          Identity verified. Please create a new password for your account.
        </p>
        <div class="input-group">
          <input 
            v-model="newPassword" 
            type="password" 
            placeholder="New Password" 
            class="std-input"
          />
        </div>
        <div class="input-group">
          <input 
            v-model="confirmPassword" 
            type="password" 
            placeholder="Confirm Password" 
            class="std-input"
            @keyup.enter="handleResetPassword"
          />
        </div>
        <button class="btn-primary" @click="handleResetPassword" :disabled="isLoading">
          {{ isLoading ? 'Resetting...' : 'Set Password' }}
        </button>
      </div>

      <div v-else class="step-content success-view">
        <p class="description">
          Your password has been successfully updated. You can now login with your new credentials.
        </p>
        <button class="btn-primary" @click="goBackToLogin">
          Back to Login
        </button>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 共用樣式：與 TwoFactorAuth.vue 和 StudentDashboard.vue 保持一致 */

.auth-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f3f4f6; /* 統一背景色 */
  padding: 1rem;
}

.auth-card {
  background: white;
  width: 100%;
  max-width: 420px; /* 稍微窄一點，適合表單 */
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.card-header {
  margin-bottom: 2rem;
}

.icon-wrapper {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.card-header h2 {
  font-size: 1.5rem;
  color: #1f2937;
  font-weight: 700;
}

.description {
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

/* 輸入框容器 */
.input-group {
  margin-bottom: 1.25rem;
  text-align: left;
}

/* 一般輸入框 (Email, Password) */
.std-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.2s;
  background-color: #f9fafb;
}

.std-input:focus {
  border-color: #111827; /* 聚焦時改為深色邊框，符合 primary button 色系 */
  background-color: white;
  outline: none;
}

/* 2FA 專用輸入框 (大字號、置中、寬間距) */
.code-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1.5rem;
  text-align: center;
  letter-spacing: 0.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: border-color 0.2s;
  background-color: #fff;
}

.code-input:focus {
  border-color: #4ade80; /* 驗證碼聚焦時用綠色 */
  outline: none;
}

/* 按鈕樣式 (完全一致) */
.btn-primary {
  width: 100%;
  padding: 0.8rem;
  background-color: #111827; /* Dark Button */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
  margin-bottom: 1rem;
}

.btn-primary:hover:not(:disabled) {
  background-color: #000;
}

.btn-primary:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.btn-secondary {
  width: 100%;
  padding: 0.8rem;
  background: white;
  border: 1px solid #d1d5db;
  color: #374151;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  margin-bottom: 1rem;
}

.btn-secondary:hover {
  background-color: #f9fafb;
}

.btn-text {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  text-decoration: underline;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.btn-text:hover {
  color: #111827;
}

/* 錯誤訊息 */
.error-banner {
  background-color: #fee2e2;
  color: #b91c1c;
  padding: 0.75rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  text-align: center;
}
</style>