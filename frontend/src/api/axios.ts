import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  withCredentials: true, // 必須加入
});

// Request 攔截（不再處理 Authorization header）
apiClient.interceptors.request.use((config) => {
  return config;
});

// Response 攔截
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore();
      authStore.clearUser();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
