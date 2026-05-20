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
          Join the team building India's most advanced<br>
          AI-powered agricultural marketing platform.<br>
          Smart campaigns across 690 districts.
        </p>
        <div class="hero-features">
          <div class="feature-item">✅ AI Disease Prediction</div>
          <div class="feature-item">✅ Multi-language Campaigns</div>
          <div class="feature-item">✅ NDVI Satellite Monitoring</div>
          <div class="feature-item">✅ WhatsApp + SMS + Voice</div>
        </div>
        <div class="hero-badge">
          <span>🏆</span> Syngenta AI Hackathon 2026
        </div>
      </div>
    </div>

    <!-- Right Panel - Register Form -->
    <div class="login-form-panel">
      <div class="form-wrapper">
        <!-- Success State -->
        <div v-if="registered" class="success-state">
          <div class="success-icon">✅</div>
          <h2 class="form-title">Registration Successful!</h2>
          <p class="success-msg">
            Your account has been created. Please wait for <strong>admin approval</strong> before you can login.
          </p>
          <p class="success-sub">You will be notified once your account is approved.</p>
          <router-link to="/login" class="login-btn" style="text-decoration: none; display: block; text-align: center;">
            ← Back to Sign In
          </router-link>
        </div>

        <!-- Register Form -->
        <template v-else>
          <div class="form-header">
            <h2 class="form-title">Create Account</h2>
            <p class="form-subtitle">Start managing smart campaigns for farmers</p>
          </div>

          <div v-if="error" class="error-box">{{ error }}</div>

          <form @submit.prevent="handleRegister" class="login-form">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <div class="input-wrap" :class="{focused: focusedField === 'name'}">
                <span class="input-icon">👤</span>
                <input type="text" v-model="name" placeholder="Enter your full name"
                       @focus="focusedField = 'name'" @blur="focusedField = ''" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <div class="input-wrap" :class="{focused: focusedField === 'email'}">
                <span class="input-icon">📧</span>
                <input type="email" v-model="email" placeholder="you@syngenta.com"
                       @focus="focusedField = 'email'" @blur="focusedField = ''" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Department</label>
              <div class="input-wrap" :class="{focused: focusedField === 'department'}">
                <span class="input-icon">🏢</span>
                <select v-model="department" @focus="focusedField = 'department'" @blur="focusedField = ''" required>
                  <option value="" disabled>Select department</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Field Operations">Field Operations</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-wrap" :class="{focused: focusedField === 'password'}">
                <span class="input-icon">🔒</span>
                <input :type="showPassword ? 'text' : 'password'" v-model="password" placeholder="Create a password"
                       @focus="focusedField = 'password'" @blur="focusedField = ''" required minlength="3" />
                <button type="button" class="toggle-pass" @click="showPassword = !showPassword">
                  {{ showPassword ? '🙈' : '👁️' }}
                </button>
              </div>
            </div>

            <button type="submit" class="login-btn" :disabled="loading">
              <span v-if="loading" class="spinner"></span>
              {{ loading ? 'Creating Account...' : 'Create Account' }}
            </button>
          </form>

          <p class="form-link">
            Already have an account? <router-link to="/login">Sign In</router-link>
          </p>
        </template>

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
  name: 'Register',
  data() {
    return {
      name: '',
      email: '',
      password: '',
      department: '',
      showPassword: false,
      loading: false,
      registered: false,
      error: '',
      focusedField: '',
    }
  },
  methods: {
    async handleRegister() {
      this.loading = true
      this.error = ''
      try {
        const { data } = await axios.post(`${API}/auth/register`, {
          name: this.name,
          email: this.email,
          password: this.password,
          department: this.department,
        })
        if (data.success) {
          this.registered = true
        }
      } catch (e) {
        this.error = e.response?.data?.error || 'Registration failed. Try again.'
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
  background: linear-gradient(180deg, rgba(10,14,23,0.3) 0%, rgba(10,14,23,0.5) 40%, rgba(10,14,23,0.85) 80%, rgba(10,14,23,0.95) 100%);
}
.hero-content {
  position: relative;
  z-index: 2;
  padding: 48px;
  width: 100%;
}
.hero-logo { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.logo-circle {
  width: 52px; height: 52px; border-radius: 14px;
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3);
  display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
}
.hero-title { font-size: 28px; font-weight: 800; color: #fff; }
.hero-desc { font-size: 15px; color: rgba(255,255,255,0.7); line-height: 1.7; margin-bottom: 24px; }
.hero-features { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
.feature-item { font-size: 14px; color: rgba(255,255,255,0.6); }
.hero-badge {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 18px;
  background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25);
  border-radius: 24px; font-size: 13px; color: rgba(255,255,255,0.8);
}

.login-form-panel {
  width: 480px; min-width: 420px; display: flex; align-items: center; justify-content: center;
  background: #0f1219; border-left: 1px solid rgba(255,255,255,0.06);
}
.form-wrapper { width: 100%; max-width: 360px; padding: 40px; }
.form-header { margin-bottom: 28px; }
.form-title { font-size: 26px; font-weight: 800; color: #fff; margin: 0 0 8px; }
.form-subtitle { font-size: 14px; color: rgba(255,255,255,0.45); }

.login-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7); }
.input-wrap {
  display: flex; align-items: center;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px; padding: 0 14px; transition: all 0.25s;
}
.input-wrap.focused { border-color: #10b981; background: rgba(16,185,129,0.04); box-shadow: 0 0 0 3px rgba(16,185,129,0.1); }
.input-icon { font-size: 16px; margin-right: 10px; opacity: 0.6; }
.input-wrap input, .input-wrap select {
  flex: 1; background: transparent; border: none; padding: 13px 0;
  color: #fff; font-size: 14px; outline: none; font-family: inherit;
}
.input-wrap select option { background: #1a1f2e; color: #fff; }
.input-wrap input::placeholder { color: rgba(255,255,255,0.25); }
.toggle-pass { background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px; }

.login-btn {
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none; border-radius: 12px; color: #fff;
  font-size: 15px; font-weight: 700; cursor: pointer;
  transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;
}
.login-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(16,185,129,0.35); }
.login-btn:disabled { opacity: 0.7; cursor: wait; }
.spinner {
  width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error-box {
  padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
  border-radius: 10px; color: #ef4444; font-size: 13px; text-align: center;
}
.form-link { text-align: center; font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 20px; }
.form-link a { color: #10b981; text-decoration: none; font-weight: 600; }
.form-footer { text-align: center; font-size: 12px; color: rgba(255,255,255,0.3); margin-top: 28px; }

.success-state { text-align: center; }
.success-icon { font-size: 48px; margin-bottom: 16px; }
.success-msg { font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.6; margin: 12px 0; }
.success-sub { font-size: 12px; color: rgba(255,255,255,0.35); margin-bottom: 24px; }
</style>
