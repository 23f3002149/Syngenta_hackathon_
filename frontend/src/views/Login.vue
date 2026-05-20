<template>
  <div class="login-page">
    <!-- Left Panel - Hero Image -->
    <div class="login-hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-logo">
          <div class="logo-circle">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" stroke="#10b981" stroke-width="2" fill="rgba(16,185,129,0.15)"/>
              <path d="M12 8C12 8 8 12 8 15C8 17.2 9.8 19 12 19C14.2 19 16 17.2 16 15C16 12 12 8 12 8Z" fill="#10b981"/>
            </svg>
          </div>
          <h1 class="hero-title">KrishiConnect AI</h1>
        </div>
        <p class="hero-desc">
          AI-powered agricultural marketing platform.<br>
          Personalized campaigns for 150M+ Indian farmers<br>
          across languages and channels.
        </p>
        <div class="hero-stats">
          <div class="hero-stat">
            <div class="hero-stat-value">690</div>
            <div class="hero-stat-label">Districts</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">26</div>
            <div class="hero-stat-label">Diseases</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">9</div>
            <div class="hero-stat-label">Languages</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value">99%</div>
            <div class="hero-stat-label">ML Accuracy</div>
          </div>
        </div>
        <div class="hero-badge">
          <span>🏆</span> Syngenta AI Hackathon 2026
        </div>
      </div>
    </div>

    <!-- Right Panel - Login Form -->
    <div class="login-form-panel">
      <div class="form-wrapper">
        <div class="form-header">
          <h2 class="form-title">Welcome Back</h2>
          <p class="form-subtitle">Sign in to your dashboard</p>
        </div>
        <div v-if="error" style="padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 10px; color: #ef4444; font-size: 13px; text-align: center; margin-bottom: 4px;">{{ error }}</div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label class="form-label">Email</label>
            <div class="input-wrap" :class="{focused: focusedField === 'email'}">
              <span class="input-icon">📧</span>
              <input type="email" v-model="email" placeholder="admin@krishiconnect.ai"
                     @focus="focusedField = 'email'" @blur="focusedField = ''" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-wrap" :class="{focused: focusedField === 'password'}">
              <span class="input-icon">🔒</span>
              <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Enter your password"
                     @focus="focusedField = 'password'" @blur="focusedField = ''" required />
              <button type="button" class="toggle-pass" @click="showPassword = !showPassword">
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <label class="remember-me">
              <input type="checkbox" v-model="rememberMe" />
              <span>Remember me</span>
            </label>
            <a href="#" class="forgot-link">Forgot password?</a>
          </div>

          <button type="submit" class="login-btn" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <p style="text-align: center; font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 20px;">
          Don't have an account? <router-link to="/register" style="color: #10b981; text-decoration: none; font-weight: 600;">Register</router-link>
        </p>

        <p class="form-footer">
          Powered by <strong style="color: var(--accent-green);">Syngenta India</strong> · AI Division
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { API } from '../config/api'

export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
      showPassword: false,
      rememberMe: true,
      loading: false,
      error: '',
      focusedField: '',
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true
      this.error = ''
      try {
        const { data } = await axios.post(`${API}/auth/login`, {
          email: this.email,
          password: this.password,
        })
        if (data.success) {
          localStorage.setItem('krishiconnect_user', JSON.stringify(data.user))
          this.$router.push('/')
        }
      } catch (e) {
        this.error = e.response?.data?.error || 'Login failed. Try again.'
      }
      this.loading = false
    }
  }
}
</script>

<style scoped>
.login-page {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #0a0e17;
}

/* Left Hero Panel */
.login-hero {
  flex: 1;
  position: relative;
  background: url('/farm-bg.png') center/cover no-repeat;
  display: flex;
  align-items: flex-end;
  min-width: 0;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgba(10,14,23,0.3) 0%,
    rgba(10,14,23,0.5) 40%,
    rgba(10,14,23,0.85) 80%,
    rgba(10,14,23,0.95) 100%
  );
}
.hero-content {
  position: relative;
  z-index: 2;
  padding: 48px;
  width: 100%;
}
.hero-logo {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.logo-circle {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}
.hero-title {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}
.hero-desc {
  font-size: 15px;
  color: rgba(255,255,255,0.7);
  line-height: 1.7;
  margin-bottom: 32px;
  max-width: 400px;
}
.hero-stats {
  display: flex;
  gap: 32px;
  margin-bottom: 28px;
}
.hero-stat-value {
  font-size: 24px;
  font-weight: 800;
  color: #10b981;
}
.hero-stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.5);
  margin-top: 2px;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.25);
  border-radius: 24px;
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
}

/* Right Form Panel */
.login-form-panel {
  width: 480px;
  min-width: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f1219;
  border-left: 1px solid rgba(255,255,255,0.06);
}
.form-wrapper {
  width: 100%;
  max-width: 360px;
  padding: 40px;
}
.form-header {
  margin-bottom: 36px;
}
.form-title {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}
.form-subtitle {
  font-size: 14px;
  color: rgba(255,255,255,0.45);
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.form-label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
}
.input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 0 14px;
  transition: all 0.25s;
}
.input-wrap.focused {
  border-color: #10b981;
  background: rgba(16,185,129,0.04);
  box-shadow: 0 0 0 3px rgba(16,185,129,0.1);
}
.input-icon {
  font-size: 16px;
  margin-right: 10px;
  opacity: 0.6;
}
.input-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  padding: 14px 0;
  color: #fff;
  font-size: 14px;
  outline: none;
  font-family: inherit;
}
.input-wrap input::placeholder {
  color: rgba(255,255,255,0.25);
}
.toggle-pass {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
}
.form-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.remember-me {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgba(255,255,255,0.5);
  cursor: pointer;
}
.remember-me input {
  accent-color: #10b981;
}
.forgot-link {
  font-size: 13px;
  color: #10b981;
  text-decoration: none;
  transition: opacity 0.2s;
}
.forgot-link:hover {
  opacity: 0.8;
}
.login-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  letter-spacing: 0.3px;
}
.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(16,185,129,0.35);
}
.login-btn:disabled {
  opacity: 0.7;
  cursor: wait;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.divider {
  display: flex;
  align-items: center;
  gap: 14px;
  color: rgba(255,255,255,0.2);
  font-size: 12px;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(255,255,255,0.08);
}
.social-btns {
  display: flex;
  gap: 12px;
}
.social-btn {
  flex: 1;
  padding: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  font-family: inherit;
}
.social-btn:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
}
.form-footer {
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.3);
  margin-top: 36px;
}
</style>
