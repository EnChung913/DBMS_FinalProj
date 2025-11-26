import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import ProfileSetup from '../views/ProfileSetup.vue'
import StudentDashboard from '../views/Student/StudentDashboard.vue' 

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/login' // 預設導向登入頁
    },
    {
      path: '/login',
      name: 'Login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'Register',
      component: RegisterView
    },
    {
      path: '/setup-profile',
      name: 'ProfileSetup',
      component: ProfileSetup,
      // 這裡可以加上路由守衛 (Navigation Guard) 確保只有登入者能進入
      // meta: { requiresAuth: true } 
    },
    {
      path: '/student/dashboard',
      name: 'StudentDashboard',
      component: StudentDashboard,
      // meta: { requiresAuth: true, role: 'student' } 
    }
  ]
})

export default router
