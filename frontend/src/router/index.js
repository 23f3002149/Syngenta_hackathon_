import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Campaigns from '../views/Campaigns.vue'
import NDVIMap from '../views/NDVIMap.vue'
import AdminPanel from '../views/AdminPanel.vue'
import CropOverview from '../views/CropOverview.vue'
import Inventory from '../views/Inventory.vue'
import ChannelRouting from '../views/ChannelRouting.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login, meta: { noLayout: true } },
  { path: '/register', name: 'Register', component: Register, meta: { noLayout: true } },
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/overview', name: 'Crop Overview', component: CropOverview },
  { path: '/campaigns', name: 'Campaigns', component: Campaigns },
  { path: '/ndvi', name: 'NDVI Map', component: NDVIMap },
  { path: '/inventory', name: 'Inventory', component: Inventory },
  { path: '/channels', name: 'Channel Routing', component: ChannelRouting },
  { path: '/admin', name: 'Admin Panel', component: AdminPanel, meta: { adminOnly: true } },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Auth guard
router.beforeEach((to, from, next) => {
  const authData = localStorage.getItem('krishiconnect_user')
  const isPublic = to.path === '/login' || to.path === '/register'
  
  if (isPublic) {
    next()
    return
  }
  
  if (!authData) {
    next('/login')
    return
  }
  
  // Admin-only route check
  if (to.meta.adminOnly) {
    const user = JSON.parse(authData)
    if (user.role !== 'admin') {
      next('/')
      return
    }
  }
  
  next()
})

export default router
