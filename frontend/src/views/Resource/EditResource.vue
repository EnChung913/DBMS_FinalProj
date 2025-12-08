<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '@/api/axios'
import { useAuthStore } from '@/stores/auth'

// 定義介面以確保型別安全
interface ResourceForm {
  title: string
  resource_type: string
  quota: number
  deadline: string
  description: string
}

interface Condition {
  condition_id?: string
  department_id: string
  avg_gpa?: number
  current_gpa?: number
  is_poor?: boolean
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const isFetching = ref(true)
const resourceId = route.params.id as string

const pageTitle = 'Edit Resource'
const pageSubtitle = 'Modify details and eligibility conditions of the resource'

// 表單初始值
const formData = ref<ResourceForm>({
  title: '',
  resource_type: '',
  quota: 1,
  deadline: '',
  description: '',
})

const conditions = ref<Condition[]>([])
const departmentOptions = ref<any[]>([])
const removeList = ref<string[]>([]) // 使用 ref 以便管理

const isCompany = authStore.role === 'company'

// 選項設定
const resourceTypes = [
  { value: 'Scholarship', label: 'Scholarship' },
  { value: 'Internship', label: 'Internship' },
  { value: 'Lab', label: 'Lab' },
  { value: 'Competition', label: 'Competition' },
  { value: 'Others', label: 'Others' },
]

onMounted(async () => {
  try {
    // 1. 取得系所選項
    const deptRes = await apiClient.get('api/common/departments')
    departmentOptions.value = deptRes.data

    // 2. 取得資源詳情
    const res = await apiClient.get(`api/resource/${resourceId}`)
    formData.value = res.data

    // 3. 取得條件
    // 注意：請確認後端是否有這個 GET 路由，若無會報錯
    const condRes = await apiClient.get(`api/resource/${resourceId}/condition`)
    conditions.value = condRes.data

    if (conditions.value.length === 0) {
      addCondition()
    }
  } catch (error) {
    console.error('Fetch error:', error)
    alert('Cannot fetch resource data.')
    router.back()
  } finally {
    isFetching.value = false
  }
})

const addCondition = () => {
  conditions.value.push({
    department_id: '',
    avg_gpa: undefined,
    current_gpa: undefined,
    is_poor: false,
  })
}

const removeCondition = (index: number) => {
  const cond = conditions.value[index]
  //if (!confirm(`Are you sure to remove Rule #${index + 1}?`)) return;
  if (!cond) {
    alert('Condition not found.')
    return
  }
  // 如果該條件已有 ID (存在於資料庫)，則加入待刪除清單
  if (cond.condition_id) {
    removeList.value.push(cond.condition_id)
  }

  conditions.value.splice(index, 1)
}

const handleSubmit = async () => {
  if (isLoading.value) return

  // 簡易前端驗證
  if (!formData.value.title || !formData.value.deadline) {
    alert('Please fill in Title and Deadline.')
    return
  }

  isLoading.value = true

  try {
    // ==========================================
    // 步驟 1: 刪除被移除的條件
    // ==========================================
    // 假設後端路由: DELETE api/resource/condition/:condition_id
    // 你需要確認後端是否有對應 Controller
    await Promise.all(
      removeList.value.map((id) => apiClient.delete(`api/resource/condition/${id}`)),
    )

    // ==========================================
    // 步驟 2: 更新 Resource 本體 (修正重點)
    // ==========================================
    //  @Post(':resource_id/modify')
    const resourcePayload = {
      title: formData.value.title,
      resource_type: formData.value.resource_type,
      quota: Number(formData.value.quota), // 確保轉為數字
      deadline: formData.value.deadline,
      description: formData.value.description,
    }

    // 發送請求
    await apiClient.post(`api/resource/${resourceId}/modify`, resourcePayload)

    // ==========================================
    // 步驟 3: 更新或新增條件
    // ==========================================
    for (const cond of conditions.value) {
      // 複製並清理 payload
      const payload: any = { ...cond }
      delete payload.condition_id
      delete payload.resource_id

      // 移除空字串的 department_id (視後端驗證需求而定)
      if (!payload.department_id) delete payload.department_id

      // 確保數值型別正確
      if (payload.avg_gpa) payload.avg_gpa = Number(payload.avg_gpa)
      if (payload.current_gpa) payload.current_gpa = Number(payload.current_gpa)

      if (cond.condition_id) {
        // --- 編輯既有條件 ---
        // 假設後端路由: PUT api/resource/:condition_id/edit
        await apiClient.put(`api/resource/${cond.condition_id}/edit`, payload)
      } else {
        // --- 新增新條件 ---
        // 假設後端路由: POST api/resource/:resource_id/condition
        await apiClient.post(`api/resource/${resourceId}/condition`, payload)
      }
    }

    alert('Update success')

    // 導航回列表
    if (isCompany) router.push('/company/dashboard')
    else router.push('/department/dashboard')
  } catch (error: any) {
    console.error('Submit Error:', error)

    // 抓取後端回傳的具體錯誤訊息
    const message = error.response?.data?.message
    const errorDetail = Array.isArray(message) ? message.join(', ') : message

    alert(`Update failed: ${errorDetail || 'Unknown error'}`)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => router.back()
</script>
<template>
  <div class="page-container">
    <div class="outer-header">
      <button class="btn-back-outer" @click="goBack"><span class="icon">⮐ </span>Back</button>
    </div>

    <div v-if="isFetching" class="loading-wrapper">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div v-else class="form-card">
      <div class="card-header">
        <div class="header-content">
          <h2>{{ pageTitle }}</h2>
          <span class="subtitle">{{ pageSubtitle }}</span>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="main-form">
        <div class="form-group">
          <label>Title</label>
          <input v-model="formData.title" type="text" />
        </div>

        <div class="row">
          <div class="form-group col">
            <label>Type</label>
            <div class="select-wrapper">
              <select v-model="formData.resource_type" required>
                <option v-for="opt in resourceTypes" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <span class="arrow">▼</span>
            </div>
          </div>

          <div class="form-group col">
            <label>Quota</label>
            <input v-model="formData.quota" type="number" min="1" required />
          </div>
        </div>

        <div class="form-group">
          <label>Deadline</label>
          <input v-model="formData.deadline" type="date" required />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            v-model="formData.description"
            rows="8"
            required
            placeholder="Provide detailed information about the resource here..."
          ></textarea>
        </div>

        <hr class="divider" />

        <div class="form-section">
          <div class="section-head-row">
            <label>Eligibility Conditions</label>
            <button type="button" class="btn-add-cond" @click="addCondition">+ New rules</button>
          </div>
          <p class="hint-text">
            You can set multiple sets of rules. Students can apply if they meet any set of rules.
          </p>

          <div v-for="(cond, index) in conditions" :key="index" class="condition-box">
            <div class="cond-header">
              <span class="cond-index">Rule #{{ index + 1 }}</span>
              <button
                type="button"
                class="btn-remove"
                @click="removeCondition(index)"
                v-if="conditions.length > 1"
              >
                Remove
              </button>
            </div>

            <div class="row">
              <div class="form-group col">
                <label>Department</label>
                <select v-model="cond.department_id">
                  <option value="">All Departments</option>
                  <option v-for="dept in departmentOptions" :key="dept.id" :value="dept.id">
                    {{ dept.name }}
                  </option>
                </select>
              </div>

              <div class="form-group col">
                <label>Low Income</label>
                <div class="checkbox-wrapper">
                  <input class="" type="checkbox" v-model="cond.is_poor" :id="`poor-${index}`" />
                  <label :for="`poor-${index}`" class="inline-label">限清寒學生</label>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="form-group col">
                <label>Min Avg GPA</label>
                <input
                  v-model.number="cond.avg_gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.3"
                  placeholder="Unrestricted"
                />
              </div>
              <div class="form-group col">
                <label>Min Current GPA</label>
                <input
                  v-model.number="cond.current_gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="4.3"
                  placeholder="Unrestricted"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-cancel" @click="goBack">Cancel</button>
          <button type="submit" class="btn-primary-gradient" :disabled="isLoading">
            {{ isLoading ? 'Saving...' : 'Saved' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/main.css';

/* 背景與容器 */
.page-container {
  padding: 40px 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 外部 Header */
.outer-header {
  width: 100%;
  max-width: 720px;
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

.btn-back-outer {
  background: transparent;
  border: none;
  color: var(--secondary-color);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.btn-back-outer:hover {
  background: rgba(0, 0, 0, 0.03);
  color: var(--primary-color);
  transform: translateX(-3px);
}

/* Form Card - 精緻卡片 */
.form-card {
  width: 100%;
  max-width: 700px;
  min-width: 700px;
  background: #fff;
  padding: 40px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.02);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Card Header */
.card-header {
  background: linear-gradient(135deg, #fff 0%, #fcfcfc 100%);
  padding: 30px 40px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-content h2 {
  margin: 0;
  color: var(--accent-color);
  font-size: 1.8rem;
}

.subtitle {
  color: #999;
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}

/* Form Body */
.main-form {
  padding: 40px;
}

.row {
  display: flex;
  gap: 25px;
}
.col {
  flex: 1;
}
.form-group {
  margin-bottom: 25px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-color);
  font-weight: 500;
  font-size: 0.95rem;
}

/* 輸入框優化 */
input,
select,
textarea {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 1rem;
  background: #fafafa;
  transition: all 0.3s;
  box-sizing: border-box;
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(125, 157, 156, 0.1);
}

textarea {
  resize: vertical;
}

/* 自訂 Select 箭頭 */
.select-wrapper {
  position: relative;
}
.select-wrapper select {
  appearance: none;
  cursor: pointer;
}
.select-wrapper .arrow {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.7rem;
  color: #888;
  pointer-events: none;
}

/* Form Actions */
.form-actions {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 15px;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #ddd;
  color: #666;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background: #f5f5f5;
  color: #333;
}

.btn-primary-gradient {
  background: linear-gradient(135deg, var(--primary-color) 0%, #6b8c8b 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(125, 157, 156, 0.3);
}

.btn-primary-gradient:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(125, 157, 156, 0.4);
}

.btn-primary-gradient:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Loading State */
.loading-wrapper {
  text-align: center;
  padding: 80px 0;
  color: var(--secondary-color);
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top: 3px solid var(--primary-color);
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

/* Section & Condition Styles */
.divider {
  border: 0;
  border-top: 1px solid #eee;
  margin: 30px 0;
}
.section-title {
  font-size: 1.1rem;
  color: var(--text-color);
  margin: 0;
  font-weight: 700;
  border-left: 4px solid var(--primary-color);
  padding-left: 10px;
}
.section-head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.hint-text {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 20px;
}

.condition-box {
  background: #f9fafb;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.2s;
}
.condition-box:hover {
  border-color: var(--primary-color);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
}

.cond-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}
.cond-index {
  font-weight: 700;
  color: var(--accent-color);
  font-size: 0.9rem;
}
.btn-remove {
  background: transparent;
  border: 1px solid #ffcdd2;
  color: #d32f2f;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
}
.btn-remove:hover {
  background: #ffebee;
}

.btn-add-cond {
  background: transparent;
  border: 1px dashed var(--primary-color);
  color: var(--primary-color);
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
}
.btn-add-cond:hover {
  background: rgba(125, 157, 156, 0.1);
}

.checkbox-wrapper {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 8px;
  height: 100%;
}
.inline-label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}
.checkbox-wrapper {
  display: flex;
  align-items: center; /* 垂直置中 */
  gap: 15px;
  padding-left: 5px;
  min-height: 48px;
}

/* 確保 Checkbox 本身沒有多餘邊距 */
.checkbox-wrapper input[type='checkbox'] {
  margin: 0;
  width: 18px;
  height: 18px;
  accent-color: var(--primary-color);
  cursor: pointer;
}

.inline-label {
  margin: 0;
  font-weight: normal;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-color);
  user-select: none;

  /* (選用) 如果覺得字太鬆，可以微調行高 */
  line-height: 1.2;
}
</style>
