<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/axios';

const router = useRouter();
const isLoading = ref(false);
const hasSearched = ref(false);

// 搜尋條件
const filters = ref({
  department_name: '',
  entry_year: null as number | null,
  grade: null as number | null,
  avg_gpa_min: null as number | null,
  current_gpa_min: null as number | null,
  courses: '', // 使用逗號分隔輸入
  limit: 10
});

// 搜尋結果
const students = ref<any[]>([]);

const handleSearch = async () => {
  isLoading.value = true;
  hasSearched.value = true;
  students.value = [];

  try {
    // ----------------------------------------------------------------
    // TO DO: [POST] /api/company/search-students
    // Body: filters.value
    // ----------------------------------------------------------------
    // const res = await apiClient.post('/company/search-students', {
    //   ...filters.value,
    //   courses: filters.value.courses.split(',').map(c => c.trim()).filter(c => c)
    // });
    // students.value = res.data;

    // --- Mock Data (模擬搜尋結果) ---
    console.log('[Mock] Searching with:', filters.value);
    await new Promise(r => setTimeout(r, 800));

    students.value = [
      { id: 's1', name: '王小明', dept: 'Computer Science', grade: 3, gpa: 4.1, skills: ['Python', 'Vue.js'], courses: ['Database', 'Algorithms'] },
      { id: 's2', name: '陳雅婷', dept: 'Information Management', grade: 4, gpa: 3.9, skills: ['Java', 'Spring'], courses: ['System Design'] },
      { id: 's3', name: '李志豪', dept: 'Electrical Engineering', grade: 3, gpa: 4.2, skills: ['C++', 'Embedded'], courses: ['OS', 'Computer Arch'] },
    ];
    // -------------------------------

  } catch (error) {
    console.error(error);
    alert('Search failed. Please try again.');
  } finally {
    isLoading.value = false;
  }
};

const goBack = () => router.back();
</script>

<template>
  <div class="page-container">
    
    <div class="page-header">
      <button class="btn-back" @click="goBack">⮐ Back</button>
      <div class="header-title">
        <h1>Talent Search</h1>
        <p>Find the best students matching your criteria</p>
      </div>
    </div>

    <div class="search-layout">
      
      <aside class="filter-panel card">
        <h3>Search Filters</h3>
        
        <form @submit.prevent="handleSearch">
          
          <div class="form-group">
            <label>Department</label>
            <input v-model="filters.department_name" type="text" placeholder="e.g. Computer Science" />
          </div>

          <div class="row">
            <div class="form-group col">
              <label>Entry Year</label>
              <input v-model="filters.entry_year" type="number" placeholder="e.g. 110" />
            </div>
            <div class="form-group col">
              <label>Grade</label>
              <input v-model="filters.grade" type="number" min="1" max="6" placeholder="1-6" />
            </div>
          </div>

          <div class="row">
            <div class="form-group col">
              <label>Min Avg GPA</label>
              <input v-model="filters.avg_gpa_min" type="number" step="0.1" min="0" max="4.3" placeholder="0.0" />
            </div>
            <div class="form-group col">
              <label>Min Curr GPA</label>
              <input v-model="filters.current_gpa_min" type="number" step="0.1" min="0" max="4.3" placeholder="0.0" />
            </div>
          </div>

          <div class="form-group">
            <label>Courses Taken (comma separated)</label>
            <input v-model="filters.courses" type="text" placeholder="e.g. Database, Algorithms" />
          </div>

          <div class="form-group">
            <label>Limit Results</label>
            <input v-model="filters.limit" type="number" min="1" max="50" />
          </div>

          <button type="submit" class="btn-search" :disabled="isLoading">
            {{ isLoading ? 'Searching...' : 'Search Candidates' }}
          </button>
        </form>
      </aside>

      <main class="results-panel">
        
        <div v-if="isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Analyzing student profiles...</p>
        </div>

        <div v-else-if="students.length > 0" class="results-grid">
          <div v-for="student in students" :key="student.id" class="student-card card">
            <div class="card-header-row">
              <div class="avatar">{{ student.name.charAt(0) }}</div>
              <div class="student-basic">
                <h4>{{ student.name }}</h4>
                <span class="dept">{{ student.dept }} | Grade {{ student.grade }}</span>
              </div>
              <span class="gpa-badge">GPA {{ student.gpa }}</span>
            </div>
            
            <div class="card-body">
              <div class="tags-group">
                <span class="tag-label">Courses:</span>
                <div class="tags">
                  <span v-for="course in student.courses" :key="course" class="tag">{{ course }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <button class="btn-outline">View Profile</button>
              <button class="btn-primary-sm">Invite</button>
            </div>
          </div>
        </div>

        <div v-else-if="hasSearched" class="empty-state">
          <span class="icon">🔍</span>
          <p>No students found matching your criteria.</p>
        </div>

        <div v-else class="empty-state">
          <span class="icon">👈</span>
          <p>Adjust filters and click search to find talents.</p>
        </div>

      </main>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/main.css';

.page-container {
  padding: 40px 5%;
  min-width: 800px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

/* Header */
.page-header {
  display: flex; align-items: center; gap: 30px; margin-bottom: 40px;
}
.btn-back {
  background: transparent; border: 1px solid #ddd; padding: 8px 16px;
  border-radius: 8px; cursor: pointer; color: #666; transition: all 0.2s;
}
.btn-back:hover { border-color: var(--primary-color); color: var(--primary-color); }

.header-title h1 { margin: 0; color: var(--accent-color); font-size: 1.8rem; }
.header-title p { margin: 5px 0 0; color: #888; font-size: 0.95rem; }

/* Layout */
.search-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 30px;
}
@media (max-width: 900px) { .search-layout { grid-template-columns: 1fr; } }

/* Filter Panel */
.filter-panel {
  padding: 25px; height: fit-content;
}
.filter-panel h3 { margin: 0 0 20px 0; color: var(--text-color); font-size: 1.2rem; border-bottom: 1px solid #eee; padding-bottom: 10px; }

.form-group { margin-bottom: 15px; }
.row { display: flex; gap: 15px; }
.col { flex: 1; }

label { display: block; font-size: 0.85rem; color: #666; margin-bottom: 5px; font-weight: 500; }
input { 
  width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; 
  transition: border 0.2s;
}
input:focus { border-color: var(--primary-color); outline: none; }

.btn-search {
  width: 100%; padding: 12px; background-color: var(--primary-color); color: white; border: none; border-radius: 8px;
  font-weight: 600; cursor: pointer; margin-top: 10px; transition: opacity 0.2s;
}
.btn-search:hover { opacity: 0.9; }
.btn-search:disabled { background-color: #ccc; cursor: not-allowed; }

/* Results Panel */
.results-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;
}

.student-card {
  padding: 20px; display: flex; flex-direction: column; transition: transform 0.2s;
}
.student-card:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.08); }

.card-header-row { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
.avatar {
  width: 45px; height: 45px; background: #EBEBE8; border-radius: 50%; color: var(--secondary-color);
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem;
}
.student-basic { flex: 1; }
.student-basic h4 { margin: 0; color: var(--text-color); font-size: 1.1rem; }
.dept { font-size: 0.8rem; color: #888; }
.gpa-badge {
  background: rgba(125, 157, 156, 0.1); color: var(--primary-color);
  padding: 4px 8px; border-radius: 6px; font-size: 0.85rem; font-weight: 700;
}

.card-body { flex: 1; margin-bottom: 20px; }
.tags-group { margin-bottom: 10px; }
.tag-label { font-size: 0.75rem; color: #aaa; display: block; margin-bottom: 5px; text-transform: uppercase; }
.tags { display: flex; flex-wrap: wrap; gap: 5px; }
.tag { background: #f5f5f5; color: #555; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem; }

.card-footer { display: flex; gap: 10px; }
.btn-outline, .btn-primary-sm {
  flex: 1; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s;
}
.btn-outline { background: transparent; border: 1px solid #ddd; color: #666; }
.btn-outline:hover { border-color: var(--primary-color); color: var(--primary-color); }
.btn-primary-sm { background: var(--primary-color); border: 1px solid var(--primary-color); color: white; }
.btn-primary-sm:hover { opacity: 0.9; }

/* Empty & Loading */
.empty-state {
  text-align: center; padding: 60px; color: #aaa; background: #fff; border-radius: 20px; border: 2px dashed #eee;
}
.icon { font-size: 3rem; display: block; margin-bottom: 15px; opacity: 0.5; }

.loading-state { text-align: center; padding: 60px; color: var(--secondary-color); }
.spinner {
  width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid var(--primary-color);
  border-radius: 50%; margin: 0 auto 15px; animation: spin 1s linear infinite;
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Common Card Style (reuse if needed) */
.card {
  background: #fff; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);
}
</style>