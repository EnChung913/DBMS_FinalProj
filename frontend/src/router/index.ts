import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileSetup from '../views/ProfileSetup.vue';
import StudentDashboard from '../views/Student/StudentDashboard.vue';
import DepartmentDashboard from '../views/Department/DepartmentDashboard.vue';
import CompanyDashboard from '../views/Company/CompanyDashboard.vue';
import ForgotPasswordView from '../views/ForgotPasswordView.vue';
import AllResources from '../views/Student/AllResources.vue';
import MyApplications from '../views/Student/MyApplications.vue';
import CreateResource from '../views/Resource/CreateResource.vue';
import EditResource from '../views/Resource/EditResource.vue';
import DepartmentResources from '../views/Department/DepartmentResources.vue';
import CompanyResources from '../views/Company/CompanyResources.vue';
import CompanyApplications from '../views/Company/CompanyApplications.vue';
import UploadAchievement from '../views/Student/UploadAchievement.vue';
import AdminDashboard from '../views/Admin/AdminDashboard.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/register', name: 'Register', component: RegisterView },
    { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView },
    { 
      path: '/setup-profile', 
      name: 'ProfileSetup', 
      component: ProfileSetup,
      meta: { requiresAuth: true }
    },
    // --- 角色專屬路由 ---
    {
      path: '/admin/dashboard',
      name: 'AdminDashboard',
      component: AdminDashboard,
      meta: { requiresAuth: true, role: ['company','admin'] } 
     // meta: { requiresAuth: true, role: 'admin' } 
    },
    {
      path: '/student/dashboard',
      name: 'StudentDashboard',
      component: StudentDashboard,
      meta: { requiresAuth: true, role: 'student', requiresSetup: true }
    },
    {
      path: '/student/upload-achievement',
      name: 'UploadAchievement',
      component: UploadAchievement,
      meta: { requiresAuth: true, role: 'student', requiresSetup: true }
    },
    {
      path: '/department/dashboard',
      name: 'DepartmentDashboard',
      component: DepartmentDashboard,
      meta: { requiresAuth: true, role: 'department', requiresSetup: true }
    },
    {
      path: '/department/resources',
      name: 'DepartmentResources',
      component: DepartmentResources,
      meta: { requiresAuth: true, role: 'department', requiresSetup: true }
    },
    {
      path: '/company/dashboard',
      name: 'CompanyDashboard',
      component: CompanyDashboard,
      meta: { requiresAuth: true, role: 'company', requiresSetup: true }
    },
    {
      path: '/company/resources',
      name: 'CompanyResources',
      component: CompanyResources,
      meta: { requiresAuth: true, role: 'company', requiresSetup: true }
    },
    {
      path: '/company/applications',
      name: 'CompanyApplications',
      component: CompanyApplications,
      meta: { requiresAuth: true, role: 'company', requiresSetup: true }
    },
    {
      path: '/resource/create',
      name: 'CreateResource',
      component: CreateResource,
      // 設定權限：只有企業和系所可以進入
      meta: { requiresAuth: true, roles: ['company', 'department'] } 
    },
    {
      path: '/resource/edit/:id',
      name: 'EditResource',
      component: EditResource,
      meta: { requiresAuth: true, roles: ['company', 'department'] }
    },
    {
      path: '/student/resources',
      name: 'AllResources',
      component: AllResources,
      meta: { requiresAuth: true, role: 'student', requiresSetup: true }
    },
    {
      path: '/student/applications',
      name: 'MyApplications',
      component: MyApplications,
      meta: { requiresAuth: true, role: 'student', requiresSetup: true }
    },
  ]
});

// 全域路由守衛
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 1. 檢查是否需要登入
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 未登入 -> 去登入頁
    return next('/login');
  }

  // 2. 檢查是否需要完成 Profile 設定 (僅針對學生強制檢查)
  if (
    to.meta.requiresSetup && 
    authStore.role === 'student' &&   // 只有學生需要檢查
    authStore.needProfile === true    // 且狀態顯示為「需要設定」
  ) {
    // 學生未填資料 -> 強制去 Setup
    return next({ 
      name: 'ProfileSetup', 
      query: { role: 'student' } 
    });
  }

  // 3. 檢查角色權限 (支援單一 role 或多重 roles)
  const allowedRoles = to.meta.roles as string[] | undefined; // 支援陣列 (例如 ['company', 'department'])
  const requiredRole = to.meta.role as string | undefined;    // 支援單一字串 (例如 'admin')
  
  let hasPermission = true;

  if (allowedRoles) {
    // 檢查是否在允許的角色列表中
    if (!authStore.role || !allowedRoles.includes(authStore.role)) {
      hasPermission = false;
    }
  } else if (requiredRole) {
    // 檢查是否符合單一角色
    if (authStore.role !== requiredRole) {
      hasPermission = false;
    }
  }

  // // 如果沒有權限，執行智慧導向
  // if (!hasPermission) {
  //   // 避免無限迴圈：如果使用者已經在首頁或登入頁，就不跳警告
  //   if (to.path !== '/' && to.path !== '/login') {
  //     alert('Access Denied: You do not have permission to view this page.');
  //   }

  //   // 根據使用者的真實身分，送回正確的首頁
  //   switch (authStore.role) {
  //     case 'admin': return next('/admin/dashboard');
  //     case 'student': return next('/student/dashboard');
  //     case 'department': return next('/department/dashboard');
  //     case 'company': return next('/company/dashboard');
  //     default: return next('/login');
  //   }
  // }

  // 通過所有檢查
  next();
});

export default router;