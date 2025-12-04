import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import type { User } from '@/types';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);

  // 前端 UI 用的旗標（後端 login 回傳）
  const needProfile = ref<boolean | null>(null);

  const isLoggedIn = computed(() => user.value !== null);
  const role = computed(() => user.value?.role);

  // profile 完成判斷
  const isSetupDone = computed(() => needProfile.value === false);

  /* ===========================================================
     加入：更新 localStorage 的函式
     =========================================================== */
  function syncStorage() {
    localStorage.setItem(
      'auth',
      JSON.stringify({
        user: user.value,
        needProfile: needProfile.value,
      })
    );
  }

  /* ===========================================================
     覆寫你原本的 setUser / setNeedProfile，使其自動同步
     =========================================================== */
  function setUser(u: User) {
    user.value = u;
    syncStorage();
  }

  function setNeedProfile(v: boolean | null) {
    needProfile.value = v;
    syncStorage();
  }

  /* ===========================================================
     登出 / 清除
     =========================================================== */
  function clearUser() {
    user.value = null;
    needProfile.value = null;
    localStorage.removeItem('auth');
  }

  /* ===========================================================
     核心：F5 時從 localStorage 取回狀態
     =========================================================== */
  function loadFromStorage() {
    const raw = localStorage.getItem('auth');
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      user.value = data.user ?? null;
      needProfile.value = data.needProfile ?? null;
    } catch (e) {
      console.error('auth storage parse error', e);
      localStorage.removeItem('auth');
    }
  }

  return {
    user,
    needProfile,
    isLoggedIn,
    role,
    isSetupDone,

    setUser,
    setNeedProfile,
    clearUser,

    loadFromStorage,
  };
});
