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
      path: '/student/dashboard',
      name: 'StudentDashboard',
      component: StudentDashboard,
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
      path: '/resource/edit/:id', // ✅ 帶參數的路由
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
    next('/login');
    return;
  }

  // 2. 檢查是否需要完成 Profile 設定 (✅ 修改：僅針對學生強制檢查)
  if (
    to.meta.requiresSetup && 
    authStore.role === 'student' &&   // 只有學生需要檢查
    authStore.needProfile === true    // 且狀態顯示為「需要設定」
  ) {
    next({ 
      name: 'ProfileSetup', 
      query: { role: 'student' } // 帶上角色參數
    });
    return;
  }

  // 3. 檢查角色權限 (防止學生跑到企業頁面)
  const allowedRoles = to.meta.roles as string[] | undefined;
  const singleRole = to.meta.role as string | undefined;
  
  if (allowedRoles) {
    if (!authStore.role || !allowedRoles.includes(authStore.role)) {
      alert('Access Denied');
      return next('/');
    }
  } else if (singleRole) {
    if (authStore.role !== singleRole) {
      alert('Access Denied');
      // ... (原本的導向邏輯)
      if (to.meta.role && authStore.role !== to.meta.role) {
      alert('Access Denied: Role mismatch');
    
      // 導向回正確的角色首頁
      if (authStore.role === 'student') next('/student/dashboard');
      else if (authStore.role === 'department') next('/department/dashboard');
      else if (authStore.role === 'company') next('/company/dashboard');
      else next('/login');
      return;
      }
      return next('/');
    }
  }

  next();
});

export default router;