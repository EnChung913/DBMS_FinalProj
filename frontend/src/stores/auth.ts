// src/stores/auth.ts
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useRouter } from 'vue-router';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  
  const token = ref<string | null>(localStorage.getItem('token'));
  const user = ref<User | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );

  const isLoggedIn = computed(() => !!token.value);
  const role = computed(() => user.value?.role);
  const isSetupDone = computed(() => user.value?.is_setup_done ?? false);

  function setAuth(accessToken: string, userData: User) {
    token.value = accessToken;
    user.value = userData;
    localStorage.setItem('token', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
  }

  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.clear();
    router.push('/login');
  }

  function updateSetupStatus(status: boolean) {
    if (user.value) {
      user.value.is_setup_done = status;
      localStorage.setItem('user', JSON.stringify(user.value));
    }
  }

  return { token, user, isLoggedIn, role, isSetupDone, setAuth, clearAuth, updateSetupStatus };
});