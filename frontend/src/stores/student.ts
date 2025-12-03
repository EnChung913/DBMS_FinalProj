import { defineStore } from 'pinia';

// 定義 GPA record 型別（精準對應 API）
export interface GpaRecord {
  semester: string;
  gpa: number;
  avg_gpa: number;
  credits?: number;
}

export interface ProfilePayload {
  user_id: string;
  student_id: string;
  department_id: string;
  grade: number;
  name: string;
  is_poor: boolean;
}

export const useStudentStore = defineStore('student', {
  state: () => ({
    user_id: '',
		name: '',
    student_id: '',
    department_id: '',
    grade: 0,
    is_poor: null as boolean | null,

    gpa_records: [] as GpaRecord[],
    current_gpa: null as number | null,
    avg_gpa: null as number | null,
  }),

  getters: {
    hasProfile: (state) => state.user_id !== '',
    hasGpaRecords: (state) => state.gpa_records.length > 0,
  },

  actions: {
    setProfile(data: ProfilePayload) {
      this.user_id = data.user_id;
      this.name = data.name;
      this.student_id = data.student_id;
      this.department_id = data.department_id;
      this.grade = data.grade;
      this.is_poor = data.is_poor;
    },

    setGpaRecords(records: GpaRecord[]) {
      this.gpa_records = records;

      if (records.length === 0) {
        this.current_gpa = null;
        this.avg_gpa = null;
        return;
      }

      const latest = records[records.length - 1];
			if(!latest) return;
      this.current_gpa = latest.gpa;
      this.avg_gpa = latest.avg_gpa;
    }
  }
});
