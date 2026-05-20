<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>Admin Panel</h2>
        <p class="subtitle">Manage employee access & verify registrations</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button :class="['tab-btn', filter === '' ? 'active' : '']" @click="filter = ''; fetchUsers()">
          All ({{ counts.total }})
        </button>
        <button :class="['tab-btn pending-tab', filter === 'pending' ? 'active' : '']" @click="filter = 'pending'; fetchUsers()">
          🔔 Pending ({{ counts.pending }})
        </button>
        <button :class="['tab-btn', filter === 'approved' ? 'active' : '']" @click="filter = 'approved'; fetchUsers()">
          Approved ({{ counts.approved }})
        </button>
        <button :class="['tab-btn', filter === 'rejected' ? 'active' : '']" @click="filter = 'rejected'; fetchUsers()">
          Rejected ({{ counts.rejected }})
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">{{ counts.total }}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Pending Approval</div>
        <div class="stat-value">{{ counts.pending }}</div>
        <div class="stat-sub" v-if="counts.pending > 0">Action required!</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Approved</div>
        <div class="stat-value">{{ counts.approved }}</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Rejected</div>
        <div class="stat-value">{{ counts.rejected }}</div>
      </div>
    </div>

    <!-- Users List -->
    <div class="user-grid">
      <div v-for="u in users" :key="u.id" class="user-card" :class="'user-' + u.status">
        <div class="user-top">
          <div class="user-avatar" :style="{background: avatarColor(u.name)}">
            {{ u.name.charAt(0).toUpperCase() }}
          </div>
          <div class="user-info">
            <div class="user-name">{{ u.name }}</div>
            <div class="user-email">{{ u.email }}</div>
          </div>
          <span :class="'status-pill status-' + u.status">{{ u.status }}</span>
        </div>

        <div class="user-details">
          <div class="user-detail">
            <span class="detail-label">Role</span>
            <span class="detail-val" :style="{color: u.role === 'admin' ? '#f59e0b' : '#818cf8'}">
              {{ u.role === 'admin' ? '👑 Admin' : '👤 Employee' }}
            </span>
          </div>
          <div class="user-detail">
            <span class="detail-label">Department</span>
            <span class="detail-val">{{ u.department || '—' }}</span>
          </div>
          <div class="user-detail">
            <span class="detail-label">Registered</span>
            <span class="detail-val">{{ formatDate(u.created_at) }}</span>
          </div>
          <div class="user-detail" v-if="u.approved_at">
            <span class="detail-label">Reviewed</span>
            <span class="detail-val">{{ formatDate(u.approved_at) }}</span>
          </div>
        </div>

        <div class="user-actions" v-if="u.role !== 'admin'">
          <template v-if="u.status === 'pending'">
            <button class="action-btn approve" @click="approveUser(u)" :disabled="processing === u.id">
              ✅ Approve
            </button>
            <button class="action-btn reject" @click="rejectUser(u)" :disabled="processing === u.id">
              ❌ Reject
            </button>
          </template>
          <template v-else-if="u.status === 'rejected'">
            <button class="action-btn approve" @click="approveUser(u)" :disabled="processing === u.id">
              ✅ Approve Instead
            </button>
          </template>
          <button class="action-btn delete" @click="deleteUser(u)" :disabled="processing === u.id">
            🗑️ Delete
          </button>
        </div>
        <div v-else class="user-actions">
          <span style="font-size: 12px; color: var(--text-muted);">System admin — cannot be modified</span>
        </div>
      </div>
    </div>

    <div v-if="users.length === 0" class="card" style="text-align: center; padding: 40px;">
      <p style="color: var(--text-muted);">No users found for this filter.</p>
    </div>

    <!-- System Reset Section -->
    <div class="reset-section">
      <div class="reset-header">
        <div>
          <h3 style="color: var(--accent-red); margin: 0;">⚠️ System Reset</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Clear all pipeline data to start fresh. Core data (districts, crops, diseases) will NOT be affected.</p>
        </div>
      </div>

      <div class="reset-info">
        <div class="reset-will-clear">
          <div class="reset-label">🗑️ Will be CLEARED:</div>
          <div class="reset-items">
            <span class="reset-tag danger">Campaigns</span>
            <span class="reset-tag danger">Predictions</span>
            <span class="reset-tag danger">Delivery Logs</span>
            <span class="reset-tag danger">Weather Cache</span>
            <span class="reset-tag danger">NDVI Alerts</span>
            <span class="reset-tag danger">Feedback</span>
          </div>
        </div>
        <div class="reset-will-keep">
          <div class="reset-label">✅ Will be KEPT:</div>
          <div class="reset-items">
            <span class="reset-tag safe">690 Districts</span>
            <span class="reset-tag safe">Crop Mappings</span>
            <span class="reset-tag safe">26 Diseases</span>
            <span class="reset-tag safe">Users & Auth</span>
          </div>
        </div>
      </div>

      <div class="reset-action">
        <div class="reset-input-row">
          <input type="text" v-model="resetConfirm" placeholder='Type RESET to confirm' class="reset-input" />
          <button class="action-btn delete" style="flex: 0; padding: 10px 20px;" 
                  @click="handleReset" :disabled="resetConfirm !== 'RESET' || resetting">
            {{ resetting ? 'Resetting...' : '🗑️ Reset System' }}
          </button>
        </div>
      </div>

      <div v-if="resetResult" class="reset-result">
        <p style="color: var(--accent-green); font-weight: 600;">✅ {{ resetResult.message }}</p>
        <div class="reset-counts">
          <span v-for="(count, key) in resetResult.cleared" :key="key" class="reset-count-item">
            {{ key }}: <strong>{{ count }}</strong> cleared
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { pipelineStore } from '../store/pipelineStore'
import { API } from '../config/api'

export default {
  name: 'AdminPanel',
  data() {
    return {
      users: [],
      filter: 'pending',
      processing: null,
      counts: { total: 0, pending: 0, approved: 0, rejected: 0 },
      resetConfirm: '',
      resetting: false,
      resetResult: null,
    }
  },
  mounted() {
    this.fetchUsers()
  },
  methods: {
    async fetchUsers() {
      try {
        let url = `${API}/admin/users`
        if (this.filter) url += `?status=${this.filter}`
        const { data } = await axios.get(url)
        this.users = data.users || []
        // Also fetch all for counts
        const all = await axios.get(`${API}/admin/users`)
        const allUsers = all.data.users || []
        this.counts = {
          total: allUsers.length,
          pending: allUsers.filter(u => u.status === 'pending').length,
          approved: allUsers.filter(u => u.status === 'approved').length,
          rejected: allUsers.filter(u => u.status === 'rejected').length,
        }
      } catch (e) { console.error(e) }
    },
    async approveUser(user) {
      if (!confirm(`Approve ${user.name} (${user.email})?`)) return
      this.processing = user.id
      try {
        await axios.post(`${API}/admin/users/${user.id}/approve`)
        this.fetchUsers()
      } catch (e) { alert(e.response?.data?.error || 'Error') }
      this.processing = null
    },
    async rejectUser(user) {
      if (!confirm(`Reject ${user.name} (${user.email})?`)) return
      this.processing = user.id
      try {
        await axios.post(`${API}/admin/users/${user.id}/reject`)
        this.fetchUsers()
      } catch (e) { alert(e.response?.data?.error || 'Error') }
      this.processing = null
    },
    async deleteUser(user) {
      if (!confirm(`DELETE ${user.name}? This cannot be undone.`)) return
      this.processing = user.id
      try {
        await axios.delete(`${API}/admin/users/${user.id}`)
        this.fetchUsers()
      } catch (e) { alert(e.response?.data?.error || 'Error') }
      this.processing = null
    },
    avatarColor(name) {
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
      let hash = 0
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
      return colors[Math.abs(hash) % colors.length]
    },
    formatDate(dt) {
      if (!dt) return '—'
      return new Date(dt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    },
    async handleReset() {
      if (this.resetConfirm !== 'RESET') return
      if (!confirm('Are you SURE? This will delete ALL campaigns, predictions, and delivery logs!')) return
      this.resetting = true
      this.resetResult = null
      try {
        const { data } = await axios.post(`${API}/admin/reset`, { confirm: 'RESET' })
        this.resetResult = data
        this.resetConfirm = ''
        // Clear frontend pipeline store so Dashboard doesn't show stale data
        pipelineStore.clearStore()
        
        // Show clear success feedback
        const total = Object.values(data.cleared || {}).reduce((a, b) => a + b, 0)
        setTimeout(() => {
          alert(`✅ System Reset Complete!\n\n${total} records cleared:\n• Campaigns: ${data.cleared?.campaigns || 0}\n• Predictions: ${data.cleared?.predictions || 0}\n• Delivery Logs: ${data.cleared?.delivery_logs || 0}\n• Weather Cache: ${data.cleared?.weather_cache || 0}\n• NDVI Alerts: ${data.cleared?.ndvi_alerts || 0}\n• Media Files: ${data.media_deleted?.cloudinary || 0} cloud + ${data.media_deleted?.local || 0} local\n\nDashboard will show fresh data on next pipeline run.`)
        }, 200)
      } catch (e) {
        console.error('Reset error:', e)
        alert(e.response?.data?.error || `Reset failed: ${e.message}`)
      }
      this.resetting = false
    }
  }
}
</script>

<style scoped>
.tab-btn {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  background: var(--bg-secondary); border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer; transition: all 0.2s;
}
.tab-btn:hover { border-color: var(--accent-green); color: var(--text-primary); }
.tab-btn.active { background: rgba(16,185,129,0.15); border-color: var(--accent-green); color: var(--accent-green); }
.pending-tab.active { background: rgba(245,158,11,0.15); border-color: #f59e0b; color: #f59e0b; }

.user-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}
.user-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  transition: all 0.25s;
}
.user-card:hover {
  border-color: var(--accent-green);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(16,185,129,0.08);
}
.user-pending { border-left: 3px solid #f59e0b; }
.user-approved { border-left: 3px solid #10b981; }
.user-rejected { border-left: 3px solid #ef4444; }

.user-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.user-avatar {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 800; color: #fff;
}
.user-info { flex: 1; }
.user-name { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.user-email { font-size: 12px; color: var(--text-muted); }

.status-pill {
  padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.status-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-approved { background: rgba(16,185,129,0.15); color: #10b981; }
.status-rejected { background: rgba(239,68,68,0.15); color: #ef4444; }

.user-details {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);
}
.user-detail { display: flex; flex-direction: column; gap: 2px; }
.detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.detail-val { font-size: 13px; color: var(--text-secondary); }

.user-actions { display: flex; gap: 8px; }
.action-btn {
  flex: 1; padding: 8px 12px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid; transition: all 0.2s; font-family: inherit;
}
.action-btn:disabled { opacity: 0.5; cursor: wait; }
.action-btn.approve {
  background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); color: #10b981;
}
.action-btn.approve:hover { background: rgba(16,185,129,0.2); }
.action-btn.reject {
  background: rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.3); color: #f59e0b;
}
.action-btn.reject:hover { background: rgba(245,158,11,0.2); }
.action-btn.delete {
  background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #ef4444;
  flex: 0; padding: 8px;
}
.action-btn.delete:hover { background: rgba(239,68,68,0.2); }

/* Reset Section */
.reset-section {
  margin-top: 40px;
  background: var(--bg-card);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: var(--radius);
  padding: 24px;
}
.reset-header { margin-bottom: 20px; }
.reset-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}
.reset-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.reset-items { display: flex; flex-wrap: wrap; gap: 6px; }
.reset-tag {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
}
.reset-tag.danger { background: rgba(239,68,68,0.12); color: #ef4444; }
.reset-tag.safe { background: rgba(16,185,129,0.12); color: #10b981; }
.reset-input-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.reset-input {
  flex: 1;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  letter-spacing: 2px;
  text-transform: uppercase;
}
.reset-input:focus { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
.reset-result {
  margin-top: 16px;
  padding: 14px;
  background: rgba(16,185,129,0.08);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: 10px;
}
.reset-counts { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
.reset-count-item { font-size: 12px; color: var(--text-secondary); }
</style>
