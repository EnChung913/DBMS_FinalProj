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
  is_setup_done: boolean;
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
  user: User;
}