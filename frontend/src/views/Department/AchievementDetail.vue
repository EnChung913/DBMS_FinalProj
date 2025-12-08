<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/api/axios'

const route = useRoute()
const router = useRouter()
const achievementId = route.params.id as string
const isLoading = ref(false)

const achievement = ref<any>(null)

onMounted(async () => {
  isLoading.value = true
  try {
    // ----------------------------------------------------------------
    // TO DO: [GET] /api/department/achievement/:id
    // ----------------------------------------------------------------
    const res = await apiClient.get(`api/department/achievements/${achievementId}`)
    achievement.value = res.data
    console.log(achievement.value)
    // --- Mock Data ---
    await new Promise((r) => setTimeout(r, 300))
  } catch (error) {
    console.error(error)
    alert('Failed to load achievement details.')
    router.back()
  } finally {
    isLoading.value = false
  }
})

const handleVerify = async (decision: boolean) => {
  if (!confirm(`Are you sure to ${decision ? 'APPROVE' : 'REJECT'} this achievement?`)) return
  try {
    await apiClient.patch(`/api/department/achievements/${achievementId}/review`, {
      approve: decision,
    })
    alert(`Achievement has been ${decision ? 'APPROVED' : 'REJECTED'}.`)
    router.back()
  } catch (error) {
    console.error(error)
    alert('Verification failed.')
  }
}

const goBack = () => router.back()
</script>

<template>
  <div class="page-container">
    <div class="page-header">
      <button class="btn-back" @click="goBack">⮐ Back</button>
      <h1>Achievement Verification</h1>
    </div>

    <div v-if="isLoading" class="loading-area">Loading details...</div>

    <div v-else-if="achievement" class="detail-card">
      <div class="detail-header">
        <div class="student-info">
          <div class="avatar">{{ achievement.student_name.charAt(0) }}</div>
          <div>
            <h2 class="student-name">{{ achievement.student_name }}</h2>
            <span class="student-id">{{ achievement.student_id }}</span>
          </div>
        </div>
        <div class="status-badge pending">Pending Review</div>
      </div>

      <hr class="divider" />

      <div class="info-grid">
        <div class="info-item full-width">
          <label>Title</label>
          <div class="val title-text">{{ achievement.title }}</div>
        </div>

        <div class="info-item">
          <label>Category</label>
          <div class="val">
            <span class="tag">{{ achievement.category }}</span>
          </div>
        </div>

        <div class="info-item">
          <label>Date Range</label>
          <div class="val desc-box">{{ achievement.start_date }} ~ {{ achievement.end_date }}</div>
        </div>

        <div class="info-item full-width">
          <label>Description</label>
          <div class="val desc-box">{{ achievement.description }}</div>
        </div>

        <div class="info-item full-width">
          <label>Proof Document</label>
          <div class="val">
            <a :href="achievement.proof_link" target="_blank" class="file-link">
              🔗 View Attached Proof (PDF/Image)
            </a>
          </div>
        </div>
      </div>

      <div class="action-footer">
        <button class="btn-action reject" @click="handleVerify(false)">Reject</button>
        <button class="btn-action approve" @click="handleVerify(true)">Approve</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/main.css';

.page-container {
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-header {
  width: 100%;
  max-width: 800px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
}
.btn-back {
  background: transparent;
  border: none;
  color: var(--secondary-color);
  font-size: 1rem;
  cursor: pointer;
}
.btn-back:hover {
  color: var(--primary-color);
}
h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--accent-color);
}

.detail-card {
  width: 100%;
  max-width: 800px;
  background: #fff;
  padding: 40px;
  border-radius: 24px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.02);
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.student-info {
  display: flex;
  align-items: center;
  gap: 15px;
}
.avatar {
  width: 50px;
  height: 50px;
  background: #ebebe8;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: var(--secondary-color);
  font-size: 1.2rem;
}
.student-name {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-color);
}
.student-id {
  color: #888;
  font-size: 0.9rem;
}
.status-badge {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.status-badge.pending {
  background: #6b8c8b;
  color: #f6f6f6;
}

.divider {
  border: 0;
  border-top: 1px solid #eee;
  margin: 30px 0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 25px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.info-item.full-width {
  grid-column: 1 / -1;
}

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.95rem;
}
.val {
  font-size: 1rem;
  color: var(--text-color);
  line-height: 1.5;
}
.title-text {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.3rem;
}
.tag {
  background: #f0f0f0;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  color: #555555;
}
.desc-box {
  background: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #eee;
  white-space: pre-wrap;
}
.file-link {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.file-link:hover {
  text-decoration: underline;
}

.action-footer {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}
.btn-action.reject {
  background: transparent;
  border: 1px solid #ddd;
  color: #666;
  font-size: 1rem;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}
.btn-action.reject:hover {
  background: #f5f5f5;
}

.btn-action.approve {
  background: linear-gradient(135deg, var(--primary-color) 0%, #6b8c8b 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(125, 157, 156, 0.3);
}
.btn-action.approve:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(125, 157, 156, 0.4);
}
</style>
