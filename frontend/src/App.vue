<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import apiClient from '@/api/axios';

const router = useRouter();
const authStore = useAuthStore();


// 計算 Dashboard 連結
const dashboardLink = computed(() => {
  if (authStore.role === 'department') return '/department/dashboard';
  if (authStore.role === 'company') return '/company/dashboard';
  return '/student/dashboard';
});

async function handleLogout() {
  const router = useRouter();
  const authStore = useAuthStore();

  try {
    await apiClient.post(
      '/api/auth/logout',
      { },
      { withCredentials: true }
    );
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    authStore.clearUser();
    location.replace('/login')
  }
}
</script>

<template>
  <div class="app-wrapper">
    <header class="main-header">
      <div class="header-content" style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
        <div class="logo">
          <span class="logo-icon">❖</span>
          <span class="logo-text">UniConnect - University / Unity / Universe Connect</span>
        </div>
        
        <nav class="nav-links">
          <template v-if="!authStore.isLoggedIn">
            <router-link to="/login">Log in</router-link>
            <router-link to="/register">Register</router-link>
          </template>

          <template v-else>
            <router-link :to="dashboardLink">Dashboard</router-link>
            <a href="#" @click.prevent="handleLogout">Log out</a>
          </template>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="main-footer">
      <p>
        <span style="opacity: 0.7;">&copy; 2025</span> 
        <span style="margin: 0 8px;">|</span> 
        <span style="font-weight: 500;">大學生學習表現與資源媒合平台</span> 
        <span style="margin: 0 8px;">|</span> 
        Designed for Students
      </p>
    </footer>
  </div>
</template>

<style>
/* 這裡引入我們先前設定的全域變數與樣式 */
@import './assets/main.css';

/* App 結構佈局 */
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg-color);
}

/* Header 樣式 - 簡約質感 */
.main-header {
  /* --- 核心：毛玻璃效果 --- */
  background-color: rgba(255, 255, 255, 0.75); /* 稍微調低透明度 */
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(87, 111, 114, 0.1); /* 使用您的莫蘭迪深色陰影 */
  
  /* --- 核心：置中定位 --- */
  position: fixed;
  top: 20px; /* 距離頂部留一點空隙 */
  left: 50%; /* 從左邊推一半 */
  transform: translateX(-50%); /* 往回拉一半，達成完美置中 */
  
  /* --- 尺寸與外觀 --- */
  width: 95%; /* 手機版寬度 */
  max-width: 1000px; /* 電腦版最大寬度，不要太寬才好看 */
  border-radius: 50px; /* 大圓角，變成膠囊狀 */
  padding: 0.8rem 5rem; /* 調整內距 */
  
  /* --- 內部排版 --- */
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 100;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.3); /* 增加一點邊框質感 */
}

/* 為了讓 header-content 在膠囊內正常運作，稍微調整寬度 */
.header-content {
  width: 100%;
  max-width: 1200px; /* 其實可以設 100% */
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary-color);
  font-weight: bold;
  font-size: 1.2rem;
  letter-spacing: 1px;
}

.logo-icon {
  font-size: 1.5rem;
}

.nav-links a {
  margin-left: 20px;
  text-decoration: none;
  color: var(--text-color);
  font-size: 0.9rem;
  transition: color 0.3s;
  cursor: pointer; /* 加上游標手勢 */
}

.nav-links a:hover,
.nav-links a.router-link-active {
  color: var(--primary-color);
}

/* Main Content 樣式 - 讓內容置中 */
.main-content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 110px 20px 40px; /* 上方 padding 避開 fixed header */
  width: 100%;
  box-sizing: border-box;
}

/* Footer 樣式 - 更有質感 */
.main-footer {
  /* --- 佈局 --- */
  margin-top: auto; /* 確保它永遠在頁面最底端 */
  width: 100%;
  padding: 2.5rem 0; /* 增加垂直留白，讓畫面不擁擠 */
  
  /* --- 視覺質感 --- */
  background-color: transparent; /* 不使用純色背景，讓整體通透 */
  /* 使用主色調 (Dusty Blue) 的 20% 透明度當作頂部線條 */
  border-top: 1px solid rgba(125, 157, 156, 0.2); 
  
  /* --- 文字排版 --- */
  text-align: center;
  color: var(--accent-color); /* 使用次要文字色 */
  font-size: 0.85rem; /* 字體稍小，顯得精緻 */
  letter-spacing: 1.5px; /* [關鍵] 增加字距，瞬間提升高級感 */
  font-weight: 400;
  
  /* --- 讓文字不可選取，增加類似 App 的質感 --- */
  user-select: none; 
}

/* 頁面切換動畫 (Fade) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>