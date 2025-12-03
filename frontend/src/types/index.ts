// src/types/index.ts

// --- DB Schema 對應 ---
export type UserRole = 'student' | 'department' | 'company';
export type ResourceType = 'Scholarship' | 'Internship' | 'Lab' | 'Others';
export type AppStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';
export type AchievStatus = 'unrecognized' | 'recognized' | 'rejected';

export interface User {
  user_id: string;
  username: string;
  real_name: string;
  role: UserRole;
  needProfile: boolean;
}

export interface Resource {
  resource_id: string;
  title: string;
  resource_type: ResourceType;
  quota: number;
  description: string;
  deadline: string;
  status: 'Available' | 'Unavailable' | 'Canceled';
  supplier_name?: string;
  match_score?: number;

  // 後端傳來的條件欄位（可以用 null 或省略）
  department_id?: string | null;
  avg_gpa?: number | null;
  current_gpa?: number | null;
  is_poor?: boolean | null;

  // 前端 enrich 用
  eligibility?: {
    deptOK: boolean;
    avgGpaOK: boolean;
    currentGpaOK: boolean;
    poorOK: boolean;
    overall: boolean;
  };
}


export interface Achievement {
  achievement_id: number;
  title: string;
  category: string;
  status: AchievStatus;
  creation_date: string;
}

export interface GPA {
  semester: string;
  gpa: number;
}

// --- API 回傳格式 ---
export interface AuthResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  needProfile: boolean;
  user: User;
}