import axios from 'axios';

// 建立實例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // 讀取環境變數
  timeout: 10000,
});

// ✅ 請求攔截器 (Request Interceptor)
// 在發送請求「之前」，自動把 Token 塞進去
apiClient.interceptors.request.use(
  (config) => {
    // 從 localStorage 拿出 Token
    const token = localStorage.getItem('token');
    
    // 如果有 Token，就加到 Header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ 回應攔截器 (Response Interceptor)
// 處理 Token 過期 (401 Unauthorized) 的情況
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // 如果收到 401，代表 Token 失效或過期
      console.warn('Token 失效，強制登出');
      
      // 清除髒資料
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      
      // 強制踢回登入頁
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;