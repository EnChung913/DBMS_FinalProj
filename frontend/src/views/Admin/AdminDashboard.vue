<script setup lang="ts">
import { ref, onMounted } from 'vue'
import apiClient from '@/api/axios'

// 狀態管理
const isLoading = ref(false)
const isSystemProcessing = ref(false)
const activeTab = ref('Users') 

// 新增：手動輸入的綁定變數
const inputPromoteName = ref('')
const inputDeleteName = ref('')

// 資料 Ref
const userList = ref<any[]>([])
const pendingList = ref<any[]>([])

// 初始化
onMounted(async () => {
  const res = await apiClient.get('api/admin/pending-users')
  pendingList.value = res.data // 記得要 .data
  console.log('Pending Users:', pendingList.value)
})

// --- 通用工具：處理檔案下載 ---
const handleFileDownload = (data: Blob, headers: any, defaultName: string) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
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

// --- 功能 1: User 管理 (改為手動輸入 Username) ---

// 手動晉升
const handleManualPromote = async () => {
  const targetName = inputPromoteName.value.trim()
  if (!targetName) {
    alert('Please enter a username to promote.')
    return
  }

  try {
    await apiClient.put('api/admin/promote', {
      username: targetName
    })

    alert(`User ${targetName} has been promoted to admin.`)
  } catch (err) {
    alert('Promotion failed.')
  }

  inputPromoteName.value = ''
}


// 手動刪除
const handleManualDelete = async () => {
  const targetName = inputDeleteName.value.trim()
  if (!targetName) {
    alert('Please enter a username to delete.')
    return
  }

  if (!confirm(`Are you sure you want to DELETE user: ${targetName}?`)) return

  try {
    // 後端 delete 必須使用 user.id
    await apiClient.delete(`api/admin/user/${targetName}`)
    alert(`User ${targetName} deleted.`)
  } catch (err) {
    alert('Delete failed.')
  }

  inputDeleteName.value = ''
}


// --- 功能 2: Pending 審核 ---
const processUserReview = async (id: string, status: string) => {
  const promptText = status === 'approved' 
    ? 'Reason for approval (Optional):' 
    : 'Reason for rejection (Required):';
    
  let comment = window.prompt(promptText, "");

  if (status === 'rejected' && (!comment || comment.trim() === "")) {
    alert("Comment is required for rejection.");
    return;
  }
  if (comment === null) return;

  try {
    await apiClient.post(`/api/admin/pending/${id}`, {
      status: status,
      comment: comment || '', 
    });
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
    const response = await apiClient.get('api/admin/system/backup', { responseType: 'blob' });
    handleFileDownload(response.data, response.headers, 'backup.sql');
    alert('Backup downloaded successfully.');
  } catch (e) {
    console.error(e);
    alert('Backup failed.');
  } finally {
    isSystemProcessing.value = false;
  }
}

// --- 功能 4: 系統維護 ---
const handleSystemMaintenance = async () => {
  if (isSystemProcessing.value) return;
  isSystemProcessing.value = true;

  try {
    const { data: stats } = await apiClient.get('/api/admin/system/cleanup-preview');
    const totalToDelete = stats.users + stats.applications + stats.resources;

    const message = `
【System Maintenance Confirmation】
Data to be deleted:
👤 Expired Users: ${stats.users}
📝 Expired Applications: ${stats.applications}
📦 Expired Resources: ${stats.resources}
Total: ${totalToDelete} items will be removed.
Are you sure?`;

    if (!confirm(message)) {
      isSystemProcessing.value = false;
      return;
    }

    const response = await apiClient.post('/api/admin/system/maintenance', {}, { responseType: 'blob' });
    handleFileDownload(response.data, response.headers, 'backup-cleanup.sql');
    
    const statsHeader = response.headers['x-cleanup-stats'];
    if (statsHeader) {
       const finalStats = JSON.parse(statsHeader);
       alert(`Maintenance Complete!\nDeleted: ${finalStats.users} Users.`);
    } else {
       alert('Maintenance completed.');
    }

  } catch (e) {
    console.error(e);
    alert('System maintenance failed.');
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
        
        <div class="operations-panel">
          <div class="op-card promote-theme">
            <h3>🌟 Promote User</h3>
            <div class="input-group">
              <input 
                v-model="inputPromoteName" 
                type="text" 
                placeholder="Enter username" 
                @keyup.enter="handleManualPromote"
              />
              <button @click="handleManualPromote">Promote</button>
            </div>
          </div>

          <div class="op-card delete-theme">
            <h3>🗑 Delete User</h3>
            <div class="input-group">
              <input 
                v-model="inputDeleteName" 
                type="text" 
                placeholder="Enter username" 
                @keyup.enter="handleManualDelete"
              />
              <button @click="handleManualDelete">Delete</button>
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
          <button class="btn-sys primary" @click="handleBackupOnly" :disabled="isSystemProcessing">
            {{ isSystemProcessing ? 'Processing...' : 'Export SQL' }}
          </button>
        </div>

        <div class="system-card warning-theme">
          <div class="sys-icon-bg">🧹</div>
          <div class="sys-content">
            <h3>System Maintenance</h3>
            <p>Backup DB & Permanently delete data > 1 year old.</p>
          </div>
          <button class="btn-sys warning" @click="handleSystemMaintenance" :disabled="isSystemProcessing">
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
.operations-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.op-card {
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}

.op-card h3 {
  font-size: 0.95rem;
  margin-bottom: 0.8rem;
  color: #444;
  font-weight: 600;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group input {
  flex: 1;
  padding: 0.5rem 0.8rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
}

.input-group button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: white;
  transition: opacity 0.2s;
}

.input-group button:hover {
  opacity: 0.9;
}

/* Promote Theme */
.promote-theme {
  border-left: 4px solid #4ade80;
}
.promote-theme button {
  background-color: #4ade80;
  color: #064e3b;
}

/* Delete Theme */
.delete-theme {
  border-left: 4px solid #ef4444;
}
.delete-theme button {
  background-color: #ef4444;
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0 1rem;
  color: #999;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #eee;
}
.divider span {
  padding: 0 10px;
}

/* --- Keep existing styles below --- */
/* (請保留您原有的 dashboard-wrapper, card 等樣式) */
.dashboard-wrapper { font-family: 'Inter', sans-serif; background: #f8fafc; min-height: 100vh; }
.hero-content { max-width: 1000px; margin: 0 auto; }
.sub-greeting { font-size: 0.85rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
.hero-header h1 { margin: 0.2rem 0 0; font-size: 1.8rem; font-weight: 700; }

.tabs-container { max-width: 1000px; margin: -1.5rem auto 1.5rem; padding: 0 1rem; display: flex; gap: 0.5rem; }
.tab-btn { background: rgba(255,255,255,0.8); border: none; padding: 0.75rem 1.5rem; border-radius: 8px 8px 0 0; cursor: pointer; font-weight: 600; color: #64748b; transition: all 0.2s; position: relative; }
.tab-btn.active { background: white; color: #2563eb; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.05); }
.badge-dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; }

.content-area { max-width: 1000px; margin: 0 auto; padding: 0 1rem 2rem; }

.list-container { display: flex; flex-direction: column; gap: 1rem; }
.admin-card { background: white; border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); border: 1px solid #f1f5f9; }
.card-left { display: flex; align-items: center; gap: 1rem; }
.user-avatar { width: 42px; height: 42px; background: #eff6ff; color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; }
.user-info { display: flex; flex-direction: column; }
.info-top { display: flex; align-items: center; gap: 0.6rem; }
.username { font-weight: 600; color: #1e293b; }
.email { font-size: 0.85rem; color: #64748b; margin-top: 2px; }
.status-text { font-size: 0.85rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 20px; }
.status-text.active { background: #dcfce7; color: #166534; }

.system-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
.system-card { background: white; border-radius: 16px; padding: 1.5rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 1rem; align-items: flex-start; transition: transform 0.2s; }
.system-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
.sys-icon-bg { font-size: 1.5rem; width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; }
.primary-theme .sys-icon-bg { background: #eff6ff; }
.warning-theme .sys-icon-bg { background: #fef2f2; }
.sys-content h3 { margin: 0; font-size: 1.1rem; color: #0f172a; }
.sys-content p { margin: 0.5rem 0 0; font-size: 0.9rem; color: #64748b; line-height: 1.4; }
.btn-sys { width: 100%; padding: 0.75rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; margin-top: auto; }
.btn-sys.primary { background: #3b82f6; color: white; }
.btn-sys.warning { background: #ef4444; color: white; }
.btn-sys:disabled { opacity: 0.7; cursor: not-allowed; }

/* Role Badge & Pending styling */
.role-badge { font-size: 0.75rem; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; }
.role-badge.student { background: #e0f2fe; color: #0369a1; }
.role-badge.company { background: #f3e8ff; color: #7e22ce; }
.pending-card { border-left: 4px solid #f59e0b; }
.pending-icon { font-size: 1.2rem; margin-right: 0.5rem; }
.meta-date { font-size: 0.8rem; color: #94a3b8; }
.btn-approve { background: #22c55e; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; margin-right: 8px; }
.btn-reject { background: #ef4444; color: white; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; }
</style>