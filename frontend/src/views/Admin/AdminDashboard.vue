<script setup lang="ts">
import { ref, onMounted } from 'vue'
import apiClient from '@/api/axios'

// 狀態管理
const isLoading = ref(false)
const isSystemProcessing = ref(false) // 專門給系統操作用的 loading 狀態
const activeTab = ref('Users') 

// 資料 Ref
const userList = ref<any[]>([])
const pendingList = ref<any[]>([])

// 初始化
onMounted(async () => {
  isLoading.value = true
  try {
    // 1. 獲取 User List (假設你有這個 API，如果沒有可以保留 Mock)
    // const usersRes = await apiClient.get('/api/admin/users')
    // userList.value = usersRes.data
    
    // --- Mock User Data (若後端還沒好，保留這個) ---
    userList.value = [
      { id: 'u1', username: 'student_alex', email: 'alex@ntu.edu.tw', role: 'student', status: 'Active' },
      { id: 'u2', username: 'tsmc_hr', email: 'hr@tsmc.com', role: 'company', status: 'Active' },
      { id: 'u3', username: 'cs_office', email: 'office@cs.ntu.edu.tw', role: 'department', status: 'Active' },
    ]

    // 2. 獲取 Pending List
    const pendingRes = await apiClient.get('/api/admin/pending-users')
    pendingList.value = pendingRes.data

  } catch (error) {
    console.error('Failed to load initial data', error)
  } finally {
    isLoading.value = false
  }
})

// --- 通用工具：處理檔案下載 ---
const handleFileDownload = (data: Blob, headers: any, defaultName: string) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  
  // 嘗試從 Header 抓檔名
  const contentDisposition = headers['content-disposition'];
  let fileName = defaultName;
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?(.+)"?/);
    if (match && match[1]) fileName = match[1];
  }
  
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// --- 功能 1: User 管理 (Mock) ---
const promoteToAdmin = async (username: string) => {
  /* ... 保持原本邏輯 ... */ 
  alert('Feature pending backend implementation')
}

const deleteUser = async (id: string) => {
  /* ... 保持原本邏輯 ... */
  if (!confirm('Delete user?')) return
  userList.value = userList.value.filter((u) => u.id !== id)
}

// --- 功能 2: Pending 審核 ---
const processUserReview = async (id: string, status: string) => {
  // 對話框邏輯
  const promptText = status === 'approved' 
    ? 'Reason for approval (Optional):' 
    : 'Reason for rejection (Required):';
    
  let comment = window.prompt(promptText, "");

  // 如果是拒絕，強制要求填寫原因
  if (status === 'rejected' && (!comment || comment.trim() === "")) {
    alert("Comment is required for rejection.");
    return;
  }
  
  // 按下取消
  if (comment === null) return;

  try {
    await apiClient.post(`/api/admin/pending/${id}`, {
      status: status,
      comment: comment || '', 
    });
    
    // 移除列表項目
    // 注意：後端回傳的是 application_id，確保 key 對應正確
    pendingList.value = pendingList.value.filter((u) => u.application_id !== id);
    
    alert(`User ${status} successfully.`);
  } catch (e: any) {
    console.error(e);
    alert(e.response?.data?.message || `Failed to ${status}`);
  }
}

// --- 功能 3: 系統備份 (Export Only) ---
const handleBackupOnly = async () => {
  if (isSystemProcessing.value) return;
  isSystemProcessing.value = true;

  try {
    const response = await apiClient.get('api/admin/system/backup', {
      responseType: 'blob' // 關鍵：接收檔案流
    });
    
    handleFileDownload(response.data, response.headers, 'backup.sql');
    alert('Backup downloaded successfully.');
  } catch (e) {
    console.error(e);
    alert('Backup failed.');
  } finally {
    isSystemProcessing.value = false;
  }
}

// --- 功能 4: 系統維護 (Preview -> Backup -> Cleanup) ---
const handleSystemMaintenance = async () => {
  if (isSystemProcessing.value) return;
  isSystemProcessing.value = true;

  try {
    // A. 取得預覽統計
    const { data: stats } = await apiClient.get('/api/admin/system/cleanup-preview');
    const totalToDelete = stats.users + stats.applications + stats.resources;

    // B. 顯示確認視窗
    const message = `
【System Maintenance Confirmation】

Actions to perform:
1. Full Database Backup (SQL dump).
2. PERMANENTLY DELETE old data (> 1 year).

-----------------------------------
Data to be deleted:
👤 Expired Users: ${stats.users}
📝 Expired Applications: ${stats.applications}
📦 Expired Resources: ${stats.resources}
-----------------------------------
Total: ${totalToDelete} items will be removed.

Are you sure you want to proceed?
    `;

    if (!confirm(message)) {
      isSystemProcessing.value = false;
      return;
    }

    // C. 執行維護 (備份並清理)
    const response = await apiClient.post('/api/admin/system/maintenance', {}, {
      responseType: 'blob'
    });

    // D. 下載備份檔
    handleFileDownload(response.data, response.headers, 'backup-cleanup.sql');

    // E. 讀取清理結果 Header
    const statsHeader = response.headers['x-cleanup-stats'];
    if (statsHeader) {
       const finalStats = JSON.parse(statsHeader);
       alert(`Maintenance Complete!\nDeleted: ${finalStats.users} Users, ${finalStats.applications} Apps.`);
    } else {
       alert('Maintenance completed and backup downloaded.');
    }

  } catch (e) {
    console.error(e);
    alert('System maintenance failed. Check console for details.');
  } finally {
    isSystemProcessing.value = false;
  }
}
</script>


<template>
  <div class="dashboard-wrapper">
    <header class="hero-header">
      <div class="hero-content">
        <div class="user-welcome">
          <span class="sub-greeting">System Administration</span>
          <h1>Admin Dashboard</h1>
        </div>
      </div>
    </header>

    <div class="tabs-container">
      <button
        v-for="tab in ['Users', 'Pending', 'System']"
        :key="tab"
        :class="['tab-btn', { active: activeTab === tab }]"
        @click="activeTab = tab"
      >
        {{ tab }}
        <span v-if="tab === 'Pending' && pendingList.length > 0" class="badge-dot"></span>
      </button>
    </div>

    <div class="content-area">
      <div v-if="isLoading" class="loading-area">
        <div class="spinner"></div>
        <p>Loading system data...</p>
      </div>

      <div v-else-if="activeTab === 'Users'" class="list-container">
        <div v-for="user in userList" :key="user.id" class="admin-card">
          <div class="card-left">
            <div class="user-avatar">{{ user.username.charAt(0).toUpperCase() }}</div>
            <div class="user-info">
              <div class="info-top">
                <span class="username">{{ user.username }}</span>
              </div>
              <span class="email">{{ user.email }}</span>
            </div>
          </div>

          <div class="card-right">
            <span :class="['status-text', user.status.toLowerCase()]">{{ user.status }}</span>
            <div class="action-group">
              <button
                class="btn-icon"
                title="Promote to Admin"
                @click="promoteToAdmin(user.username)"
              >
                🌟
              </button>
              <button class="btn-icon delete" title="Delete User" @click="deleteUser(user.id)">
                🗑
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'Pending'" class="list-container">
        <div v-if="pendingList.length === 0" class="empty-state">
          <div class="empty-icon">✓</div>
          <p>No pending approvals.</p>
        </div>

        <div v-for="user in pendingList" :key="user.application_id" class="admin-card pending-card">
          <div class="card-left">
            <div class="pending-icon">⏳</div>
            <div class="user-info">
              <div class="info-top">
                <span class="username">{{ user.username }}</span>
                <span :class="['role-badge', user.role]">{{ user.role }}</span>
              </div>
              <span class="meta-date">Org: {{ user.org_name }}</span>
            </div>
          </div>
          <div class="card-right">
            <button class="btn-approve" @click="processUserReview(user.application_id, 'approved')">Approve</button>
            <button class="btn-reject" @click="processUserReview(user.application_id, 'rejected')">Reject</button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'System'" class="system-grid">
        
        <div class="system-card primary-theme">
          <div class="sys-icon-bg">📥</div>
          <div class="sys-content">
            <h3>Database Backup</h3>
            <p>Download full SQL dump without deleting data.</p>
          </div>
          <button 
            class="btn-sys primary" 
            @click="handleBackupOnly" 
            :disabled="isSystemProcessing"
          >
            {{ isSystemProcessing ? 'Processing...' : 'Export SQL' }}
          </button>
        </div>

        <div class="system-card warning-theme">
          <div class="sys-icon-bg">🧹</div>
          <div class="sys-content">
            <h3>System Maintenance</h3>
            <p>Backup DB & Permanently delete data > 1 year old.</p>
          </div>
          <button 
            class="btn-sys warning" 
            @click="handleSystemMaintenance" 
            :disabled="isSystemProcessing"
          >
             {{ isSystemProcessing ? 'Running...' : 'Start Cleanup' }}
          </button>
        </div>
        
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 補上一些關鍵的樣式以支援上述功能 */
.pending-card {
  border-left: 4px solid #f59e0b; /* Pending 黃色提示 */
}

/* 確保 Pending Card 內的 role badge 樣式正確 */
.role-badge.company { background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
.role-badge.department { background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }
.role-badge.student { background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; }

/* 系統卡片按鈕禁用狀態 */
.btn-sys:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style scoped>
@import '@/assets/main.css';

/* --- Layout --- */
.dashboard-wrapper {
  width: 95%;
  min-width: 1000px;
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 60px;
  animation: fadeIn 0.6s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- Hero Header --- */
.hero-header {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #fff 0%, #f7f5f2 100%);
  padding: 30px 40px;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.03);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
}
.hero-content {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
} /* 置中標題 */
.sub-greeting {
  color: var(--secondary-color);
  font-size: 0.9rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 600;
  display: block;
  margin-bottom: 5px;
}
.user-welcome h1 {
  font-size: 2.2rem;
  color: var(--accent-color);
  margin: 0;
}

/* --- Tabs --- */
.tabs-container {
  display: flex;
  justify-content: center;
  gap: 15px;
  margin-bottom: 40px;
}
.tab-btn {
  background: #fff;
  border: 1px solid #eee;
  padding: 10px 30px;
  border-radius: 30px;
  color: #888;
  font-weight: 600;
  cursor: pointer;
  position: relative;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
}
.tab-btn:hover {
  transform: translateY(-2px);
  color: var(--primary-color);
}
.tab-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.4);
}
.badge-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #ff5252;
  border-radius: 50%;
  border: 2px solid #fff;
}

/* --- List Cards (Users & Pending) --- */
.list-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.admin-card {
  background: #fff;
  padding: 20px 25px;
  border-radius: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.02);
  transition: transform 0.2s;
}
.admin-card:hover {
  transform: translateX(5px);
  box-shadow: 0 8px 25px rgba(125, 157, 156, 0.1);
}

.card-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Avatar & Icons */
.user-avatar {
  width: 45px;
  height: 45px;
  background: var(--input-bg);
  color: var(--secondary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
}
.pending-icon {
  width: 45px;
  height: 45px;
  background: #a9a9a9;
  color: #b3aca6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

/* Info Text */
.user-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-top {
  display: flex;
  align-items: center;
  gap: 10px;
}
.username {
  font-weight: 700;
  font-size: 1.05rem;
  color: var(--text-color);
}
.email {
  font-size: 0.9rem;
  color: #888;
}
.meta-date {
  font-size: 0.85rem;
  color: #aaa;
}

/* Badges */
.status-text {
  font-size: 0.85rem;
  font-weight: 600;
  margin-right: 15px;
}
.status-text.active {
  color: #4caf50;
}
.status-text.suspended {
  color: #ef5350;
}

/* Actions */
.card-right {
  display: flex;
  align-items: center;
}
.action-group {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid #eee;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s;
}
.btn-icon:hover {
  background: #f5f5f5;
  border-color: #ccc;
}
.btn-icon.delete:hover {
  background: #ffebee;
  color: #d32f2f;
  border-color: #ffcdd2;
}

.btn-approve,
.btn-reject {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  font-size: 0.9rem;
  transition: all 0.2s;
  margin-left: 8px;
}
.btn-approve {
  background: #e8f5e9;
  color: #2e7d32;
}
.btn-approve:hover {
  background: #c8e6c9;
}
.btn-reject {
  background: transparent;
  color: #ef5350;
  border: 1px solid #ffcdd2;
}
.btn-reject:hover {
  background: #ffebee;
}

/* --- System Grid --- */
.system-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.system-card {
  background: #fff;
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s;
}
.system-card:hover {
  transform: translateY(-5px);
}

.sys-icon-bg {
  font-size: 2.5rem;
  margin-bottom: 15px;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.warning-theme .sys-icon-bg {
  background: #fff3e0;
  color: #e65100;
}
.primary-theme .sys-icon-bg {
  background: #e3f2fd;
  color: #1565c0;
}

.sys-content h3 {
  margin: 0 0 8px 0;
  color: var(--text-color);
  font-size: 1.2rem;
}
.sys-content p {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 25px;
  line-height: 1.5;
  min-height: 40px;
}

.btn-sys {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
  font-size: 1rem;
}
.btn-sys.warning {
  background: #ff9800;
  color: white;
  box-shadow: 0 4px 10px rgba(255, 152, 0, 0.3);
}
.btn-sys.warning:hover {
  background: #f57c00;
}
.btn-sys.primary {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 4px 10px rgba(125, 157, 156, 0.4);
}
.btn-sys.primary:hover {
  opacity: 0.9;
}

/* Empty & Loading */
.empty-state {
  text-align: center;
  padding: 60px;
  color: #aaa;
  background: #fff;
  border-radius: 20px;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 10px;
  color: #ddd;
}
.loading-area {
  text-align: center;
  padding: 60px;
  color: var(--secondary-color);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid var(--primary-color);
  border-radius: 50%;
  margin: 0 auto 15px;
  animation: spin 1s linear infinite;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
