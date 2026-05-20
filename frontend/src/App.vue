<template>
  <!-- Login/Register — no sidebar -->
  <router-view v-if="$route.meta.noLayout" />

  <!-- Main layout with sidebar -->
  <div v-else class="app-layout">
    <aside class="sidebar">
      <!-- Logo: KrishiConnect or Syngenta based on theme -->
      <div class="sidebar-logo" v-if="currentTheme !== 'syngenta'">
        <div class="logo-icon">K</div>
        <div>
          <h1>KrishiConnect</h1>
          <span>Syngenta AI Platform</span>
        </div>
      </div>
      <div class="sidebar-logo syngenta-logo" v-else>
        <img src="/syngenta-logo.svg" alt="Syngenta" class="syngenta-img" />
      </div>

      <ul class="nav-links">
        <li>
          <router-link to="/">
            <span class="nav-icon">&#9673;</span>
            <span>Dashboard</span>
          </router-link>
        </li>
        <li>
          <router-link to="/overview">
            <span class="nav-icon">🌾</span>
            <span>Crop Overview</span>
          </router-link>
        </li>
        <li>
          <router-link to="/campaigns">
            <span class="nav-icon">&#9993;</span>
            <span>Campaigns</span>
          </router-link>
        </li>
        <li>
          <router-link to="/ndvi">
            <span class="nav-icon">&#9737;</span>
            <span>NDVI Map</span>
          </router-link>
        </li>
        <li>
          <router-link to="/inventory">
            <span class="nav-icon">📦</span>
            <span>Inventory</span>
          </router-link>
        </li>
        <li>
          <router-link to="/channels">
            <span class="nav-icon">📡</span>
            <span>Channel Routing</span>
          </router-link>
        </li>
        <li v-if="isAdmin">
          <router-link to="/admin">
            <span class="nav-icon">&#9881;</span>
            <span>Admin Panel</span>
            <span v-if="pendingCount > 0" class="pending-badge">{{ pendingCount }}</span>
          </router-link>
        </li>
      </ul>

      <div class="sidebar-footer">
        <!-- Theme Switcher -->
        <div class="theme-switcher">
          <button :class="['theme-btn', currentTheme === 'light' ? 'active' : '']" 
                  @click="setTheme('light')" title="Light Mode">☀️</button>
          <button :class="['theme-btn', currentTheme === 'dark' ? 'active' : '']" 
                  @click="setTheme('dark')" title="Dark Mode">🌙</button>
          <button :class="['theme-btn syngenta-btn', currentTheme === 'syngenta' ? 'active' : '']" 
                  @click="setTheme('syngenta')" title="Syngenta Brand">🌿</button>
        </div>

        <!-- User Info -->
        <div class="user-info-bar" v-if="currentUser">
          <div class="user-avatar-sm" :style="{background: avatarColor(currentUser.name)}">
            {{ currentUser.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">{{ currentUser.name }}</div>
            <div style="font-size: 11px; color: var(--text-muted);">{{ currentUser.role === 'admin' ? '👑 Admin' : '👤 Employee' }}</div>
          </div>
        </div>
        <button class="logout-btn" @click="logout">
          <span>🚪</span> Logout
        </button>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">Powered by</div>
        <div style="font-size: 13px; font-weight: 600; color: var(--accent-green);">Syngenta India</div>
      </div>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script>
import axios from 'axios'
import { API } from './config/api'

export default {
  name: 'App',
  data() {
    return {
      pendingCount: 0,
      currentTheme: localStorage.getItem('krishiconnect_theme') || 'dark',
      currentUser: null,
    }
  },
  computed: {
    isAdmin() {
      return this.currentUser?.role === 'admin'
    }
  },
  mounted() {
    this.loadUser()
    // Apply saved theme
    this.applyTheme(this.currentTheme)
    if (this.isAdmin) this.fetchPending()
  },
  watch: {
    '$route'() {
      this.loadUser()
      if (this.isAdmin) this.fetchPending()
    }
  },
  methods: {
    loadUser() {
      try {
        this.currentUser = JSON.parse(localStorage.getItem('krishiconnect_user'))
      } catch { this.currentUser = null }
    },
    setTheme(theme) {
      this.currentTheme = theme
      this.applyTheme(theme)
      localStorage.setItem('krishiconnect_theme', theme)
    },
    applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme)
    },
    async fetchPending() {
      try {
        const { data } = await axios.get(`${API}/admin/users?status=pending`)
        this.pendingCount = data.users?.length || 0
      } catch { /* ignore */ }
    },
    avatarColor(name) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
      let hash = 0
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
      return colors[Math.abs(hash) % colors.length]
    },
    logout() {
      localStorage.removeItem('krishiconnect_user')
      this.$router.push('/login')
    }
  }
}
</script>

<style>
.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  margin-top: auto;
}

/* Theme Switcher */
.theme-switcher {
  display: flex;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 14px;
  gap: 2px;
}
.theme-btn {
  flex: 1;
  padding: 7px 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.5;
}
.theme-btn:hover {
  opacity: 0.8;
  background: var(--bg-card);
}
.theme-btn.active {
  opacity: 1;
  background: var(--bg-card);
  box-shadow: 0 1px 4px rgba(0,0,0,0.15);
}

/* Syngenta Logo */
.syngenta-logo {
  justify-content: center;
}
.syngenta-img {
  height: 28px;
  width: auto;
  filter: brightness(1.1);
}
[data-theme="dark"] .syngenta-img {
  filter: brightness(0) invert(1);
}

/* User Info */
.user-info-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px;
  background: var(--bg-primary);
  border-radius: 10px;
}
.user-avatar-sm {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}
.pending-badge {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
}
.logout-btn {
  width: 100%;
  padding: 8px 12px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 8px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: inherit;
}
.logout-btn:hover {
  background: rgba(239,68,68,0.2);
}

/* Smooth theme transition */
body, .sidebar, .main-content, .card, .stat-card, .data-table td,
.btn, .badge, select, input {
  transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease !important;
}
</style>
