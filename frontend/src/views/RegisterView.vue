<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import apiClient from '@/api/axios'
// 假設 AuthResponse 類型定義可能需要放寬，或者這裡暫時用 any 處理不同結構的回傳
import type { AuthResponse, UserRole } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const isLoading = ref(false)

const confirmPassword = ref('')

const formData = ref({
  real_name: '',
  email: '',
  username: '',
  password: '',
  nickname: '',
  org_name: '', // <--- 新增這個欄位
  role: 'student' as UserRole,
})

const handleRegister = async () => {
  if (isLoading.value) return

  // 確認密碼
  if (formData.value.password !== confirmPassword.value) {
    alert('Passwords do not match')
    return
  }

  // 簡單防呆：如果是學生，把 org_name 清空避免誤傳 (雖然原本邏輯沒清空也沒差)
  if (formData.value.role === 'student') {
    formData.value.org_name = ''
  }

  isLoading.value = true
  console.log('Sending payload:', JSON.stringify(formData.value, null, 2))

  try {
    // ---- 呼叫後端註冊 API ----
    // 注意：這裡回傳的可能是 { user, accessToken... } 也可能是 { message, status: 'pending' }
    const response = await apiClient.post<any>('/api/auth/register', formData.value, {
      withCredentials: true,
    })

    const data = response.data
    console.log('status:', response.status)
    console.log('Registration response:', data)

    // ==== 邏輯分流 ====

    // 情況 A：需要審核的角色 (後端回傳 status: 'pending')
    if (data.status === 'pending' || !data.accessToken) {
      alert(data.message || 'Application submitted successfully. Please wait for admin approval.')
      // 轉導回登入頁面
      router.push('/login')
      return
    }

    // 情況 B：不需要審核的角色 (Student，後端直接回傳 accessToken)
    // 設定 user
    authStore.setUser(data.user)
    console.log('user: ', data.user)

    authStore.setNeedProfile(data.needProfile) // 確保這裡更新正確
    console.log('Need profile setup:', data.needProfile)

    // 學生註冊後導向 Profile 設定
    if (authStore.role == 'student' && data.needProfile) {
      router.push('/setup-profile')
    } else {
      // 預防萬一有不需要審核的其他角色直接進 dashboard
      router.push('/')
    }

  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      const backendError = error.response.data
      console.error('Backend Validation Error Object:', backendError)
      if (backendError.message && Array.isArray(backendError.message)) {
        alert(`Registration Failed (Validation): ${backendError.message.join('; ')}`)
      } else {
        alert(
          `Registration Failed: ${backendError.message || 'Check your password or username/email.'}`,
        )
      }
    } else {
      alert('Registration failed due to a server error.')
    }
  } finally {
    isLoading.value = false
  }
}
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
        <small
          v-if="confirmPassword && formData.password !== confirmPassword"
          style="color: var(--error-color)"
        >
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

      <div class="form-group" v-if="['company', 'department'].includes(formData.role)">
        <label>Organization Name (Company or Department Name)</label>
        <input 
          v-model="formData.org_name" 
          placeholder="e.g. NTUST CS / Google Inc."
          required 
        />
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
