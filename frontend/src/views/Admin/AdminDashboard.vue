<script setup lang="ts">
import { ref, onMounted } from 'vue';
import apiClient from '@/api/axios';

const isLoading = ref(false);
const activeTab = ref('Users'); // Users | Pending | System

// 資料 Mock
const userList = ref<any[]>([]);
const pendingList = ref<any[]>([]);

onMounted(async () => {
  isLoading.value = true;
  try {
    // ----------------------------------------------------------------
    // TO DO: 連接後端 API
    // [GET] /api/admin/users
    // [GET] /api/admin/pending-users
    // ----------------------------------------------------------------
    
    // --- Mock Data ---
    await new Promise(r => setTimeout(r, 600));
    
    userList.value = [
      { id: 'u1', username: 'student_alex', email: 'alex@ntu.edu.tw', role: 'student', status: 'Active' },
      { id: 'u2', username: 'tsmc_hr', email: 'hr@tsmc.com', role: 'company', status: 'Active' },
      { id: 'u3', username: 'cs_office', email: 'office@cs.ntu.edu.tw', role: 'department', status: 'Active' },
      { id: 'u4', username: 'bad_bot', email: 'bot@spam.com', role: 'student', status: 'Suspended' },
    ];

    pendingList.value = [
      { id: 'p1', username: 'new_startup', email: 'contact@startup.com', role: 'company', date: '2025-03-01' },
      { id: 'p2', username: 'ee_dept', email: 'office@ee.ntu.edu.tw', role: 'department', date: '2025-02-28' }
    ];

  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

// --- 功能實作 ---

// 1. 指定 Admin
const promoteToAdmin = async (username: string) => {
  const confirmName = prompt(`Please type "${username}" to confirm promotion to Admin:`);
  if (confirmName !== username) return;

  try {
    // await apiClient.post('/admin/promote', { username });
    console.log(`[Mock] Promoted ${username} to Admin`);
    alert(`${username} is now an Admin.`);
  } catch (e) { alert('Failed to promote'); }
};

// 2. 刪除帳號
const deleteUser = async (id: string) => {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
  
  try {
    // await apiClient.delete(`/admin/user/${id}`);
    console.log(`[Mock] Deleted user ${id}`);
    userList.value = userList.value.filter(u => u.id !== id);
  } catch (e) { alert('Failed to delete'); }
};

// 3. 審核通過
const approveUser = async (id: string) => {
  try {
    // await apiClient.post(`/admin/approve/${id}`);
    console.log(`[Mock] Approved user ${id}`);
    pendingList.value = pendingList.value.filter(u => u.id !== id);
  } catch (e) { alert('Failed to approve'); }
};

// 4. 一鍵清除軟刪除帳號 (一年以上)
const cleanupOldAccounts = async () => {
  if (!confirm('⚠ WARNING: This will permanently delete all accounts soft-deleted more than 1 year ago.\nContinue?')) return;
  
  try {
    // await apiClient.post('/admin/cleanup');
    console.log('[Mock] Cleanup triggered');
    alert('Cleanup task scheduled successfully.');
  } catch (e) { alert('Cleanup failed'); }
};

// 5. 匯出 CSV
const exportCsv = async () => {
  try {
    // const res = await apiClient.get('/admin/export', { responseType: 'blob' });
    // 下載邏輯...
    console.log('[Mock] Exporting CSV...');
    alert('Export started. Your download will begin shortly.');
  } catch (e) { alert('Export failed'); }
};
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
              <button class="btn-icon" title="Promote to Admin" @click="promoteToAdmin(user.username)">🌟</button>
              <button class="btn-icon delete" title="Delete User" @click="deleteUser(user.id)">🗑</button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'Pending'" class="list-container">
        <div v-if="pendingList.length === 0" class="empty-state">
          <div class="empty-icon">✓</div>
          <p>No pending approvals.</p>
        </div>
        
        <div v-for="user in pendingList" :key="user.id" class="admin-card pending-card">
          <div class="card-left">
            <div class="pending-icon">⏳</div>
            <div class="user-info">
              <div class="info-top">
                <span class="username">{{ user.username }}</span>
                <span :class="['role-badge', user.role]">{{ user.role }}</span>
              </div>
              <span class="meta-date">Applied: {{ user.date }}</span>
            </div>
          </div>
          <div class="card-right">
            <button class="btn-approve" @click="approveUser(user.id)">Approve</button>
            <button class="btn-reject">Reject</button>
          </div>
        </div>
      </div>

      <div v-else-if="activeTab === 'System'" class="system-grid">
        
        <div class="system-card warning-theme">
          <div class="sys-icon-bg">🗑</div>
          <div class="sys-content">
            <h3>Data Cleanup</h3>
            <p>Remove accounts soft-deleted > 1 year ago.</p>
          </div>
          <button class="btn-sys warning" @click="cleanupOldAccounts">Run Cleanup</button>
        </div>

        <div class="system-card primary-theme">
          <div class="sys-icon-bg">📥</div>
          <div class="sys-content">
            <h3>Data Export</h3>
            <p>Download full database as CSV.</p>
          </div>
          <button class="btn-sys primary" @click="exportCsv">Export CSV</button>
        </div>

      </div>

    </div>
  </div>
</template>

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
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* --- Hero Header --- */
.hero-header {
  margin-bottom: 30px;
  background: linear-gradient(135deg, #fff 0%, #F7F5F2 100%);
  padding: 30px 40px; border-radius: 24px;
  border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 10px 30px rgba(0,0,0,0.02);
}
.hero-content { display: flex; align-items: center; justify-content: center; text-align: center; } /* 置中標題 */
.sub-greeting {
  color: var(--secondary-color); font-size: 0.9rem; letter-spacing: 2px;
  text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 5px;
}
.user-welcome h1 { font-size: 2.2rem; color: var(--accent-color); margin: 0; }

/* --- Tabs --- */
.tabs-container { display: flex; justify-content: center; gap: 15px; margin-bottom: 40px; }
.tab-btn {
  background: #fff; border: 1px solid #eee; padding: 10px 30px;
  border-radius: 30px; color: #888; font-weight: 600; cursor: pointer;
  position: relative; transition: all 0.3s; box-shadow: 0 2px 5px rgba(0,0,0,0.02);
}
.tab-btn:hover { transform: translateY(-2px); color: var(--primary-color); }
.tab-btn.active {
  background: var(--primary-color); color: white; border-color: var(--primary-color);
  box-shadow: 0 4px 12px rgba(125, 157, 156, 0.4);
}
.badge-dot {
  position: absolute; top: -2px; right: -2px; width: 10px; height: 10px;
  background: #FF5252; border-radius: 50%; border: 2px solid #fff;
}

/* --- List Cards (Users & Pending) --- */
.list-container { display: flex; flex-direction: column; gap: 15px; }

.admin-card {
  background: #fff; padding: 20px 25px; border-radius: 16px;
  display: flex; justify-content: space-between; align-items: center;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);
  transition: transform 0.2s;
}
.admin-card:hover { transform: translateX(5px); box-shadow: 0 8px 25px rgba(125, 157, 156, 0.1); }

.card-left { display: flex; align-items: center; gap: 15px; }

/* Avatar & Icons */
.user-avatar {
  width: 45px; height: 45px; background: var(--input-bg); color: var(--secondary-color);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 1.2rem;
}
.pending-icon {
  width: 45px; height: 45px; background: #a9a9a9; color: #b3aca6;
  border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
}

/* Info Text */
.user-info { display: flex; flex-direction: column; gap: 4px; }
.info-top { display: flex; align-items: center; gap: 10px; }
.username { font-weight: 700; font-size: 1.05rem; color: var(--text-color); }
.email { font-size: 0.9rem; color: #888; }
.meta-date { font-size: 0.85rem; color: #aaa; }

/* Badges */
.status-text { font-size: 0.85rem; font-weight: 600; margin-right: 15px; }
.status-text.active { color: #4CAF50; }
.status-text.suspended { color: #EF5350; }

/* Actions */
.card-right { display: flex; align-items: center; }
.action-group { display: flex; gap: 8px; }

.btn-icon {
  width: px; height: 36px; border-radius: 8px; border: 1px solid #eee; background: transparent;
  cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
  transition: all 0.2s;
}
.btn-icon:hover { background: #f5f5f5; border-color: #ccc; }
.btn-icon.delete:hover { background: #FFEBEE; color: #D32F2F; border-color: #FFCDD2; }

.btn-approve, .btn-reject {
  padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 0.9rem; transition: all 0.2s; margin-left: 8px;
}
.btn-approve { background: #E8F5E9; color: #2E7D32; }
.btn-approve:hover { background: #C8E6C9; }
.btn-reject { background: transparent; color: #EF5350; border: 1px solid #FFCDD2; }
.btn-reject:hover { background: #FFEBEE; }

/* --- System Grid --- */
.system-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.system-card {
  background: #fff; padding: 30px; border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);
  display: flex; flex-direction: column; align-items: center; text-align: center;
  transition: transform 0.2s;
}
.system-card:hover { transform: translateY(-5px); }

.sys-icon-bg {
  font-size: 2.5rem; margin-bottom: 15px; 
  width: 70px; height: 70px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
}
.warning-theme .sys-icon-bg { background: #FFF3E0; color: #E65100; }
.primary-theme .sys-icon-bg { background: #E3F2FD; color: #1565C0; }

.sys-content h3 { margin: 0 0 8px 0; color: var(--text-color); font-size: 1.2rem; }
.sys-content p { color: #666; font-size: 0.9rem; margin-bottom: 25px; line-height: 1.5; min-height: 40px; }

.btn-sys {
  width: 100%; padding: 12px; border-radius: 12px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; font-size: 1rem;
}
.btn-sys.warning { background: #FF9800; color: white; box-shadow: 0 4px 10px rgba(255, 152, 0, 0.3); }
.btn-sys.warning:hover { background: #F57C00; }
.btn-sys.primary { background: var(--primary-color); color: white; box-shadow: 0 4px 10px rgba(125, 157, 156, 0.4); }
.btn-sys.primary:hover { opacity: 0.9; }

/* Empty & Loading */
.empty-state { text-align: center; padding: 60px; color: #aaa; background: #fff; border-radius: 20px; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; color: #ddd; }
.loading-area { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner {
  width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
  border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
</style>