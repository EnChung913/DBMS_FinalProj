import axios from 'axios';
import { useAuthStore } from '@/stores/auth'; // 使用 Store

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, 
  timeout: 10000,
});

// Request 攔截
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response 攔截
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token 過期，強制登出
      const authStore = useAuthStore();
      authStore.clearAuth(); 
    }
    return Promise.reject(error);
  }
);

export default apiClient;