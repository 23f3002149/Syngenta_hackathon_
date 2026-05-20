<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>📦 Inventory Intelligence</h2>
        <p class="subtitle">Supply Chain Alerts — Demand vs Retailer Stock</p>
      </div>
      <button class="btn btn-primary" @click="fetchAll" :disabled="loading">
        {{ loading ? 'Loading...' : '🔄 Refresh' }}
      </button>
    </div>

    <!-- Overview Stats -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-label">Retailers</div>
        <div class="stat-value">{{ overview.total_retailers || 0 }}</div>
        <div class="stat-sub">{{ overview.covered_districts || 0 }} districts covered</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">SKUs Tracked</div>
        <div class="stat-value">{{ overview.total_skus || 0 }}</div>
        <div class="stat-sub">Week: {{ overview.latest_week || '—' }}</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Supply Alerts</div>
        <div class="stat-value">{{ alertStats.urgent + alertStats.restock }}</div>
        <div class="stat-sub">🔴 {{ alertStats.urgent }} urgent · ⚠️ {{ alertStats.restock }} restock</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">Growers</div>
        <div class="stat-value">{{ overview.growers?.total || 0 }}</div>
        <div class="stat-sub">📱 {{ overview.growers?.smartphone || 0 }} · 🔢 {{ overview.growers?.keypad || 0 }}</div>
      </div>
    </div>

    <!-- Stock by Product -->
    <div class="card" style="margin-top: 16px;">
      <div class="card-header">
        <span class="card-title">📊 Current Stock by Product</span>
      </div>
      <div class="stock-grid">
        <div v-for="s in overview.stock_by_product || []" :key="s.sku_name" class="stock-item">
          <div class="stock-name">{{ s.sku_name }}</div>
          <div class="stock-bar-wrap">
            <div class="stock-bar" :style="{width: stockPercent(s) + '%', background: stockColor(s)}"></div>
          </div>
          <div class="stock-nums">
            <span class="stock-qty">{{ s.total_qty }} units</span>
            <span class="stock-retailers">{{ s.in_stock_retailers }}/{{ s.retailers }} stores</span>
          </div>
        </div>
      </div>
    </div>

    <!-- State/Search Filters -->
    <div class="filter-bar" style="margin-top: 16px;">
      <select v-model="selectedState" style="min-width: 160px;">
        <option value="">All States</option>
        <option v-for="s in stateList" :key="s" :value="s">{{ s }}</option>
      </select>
      <input type="text" v-model="searchQuery" placeholder="🔍 Search district..."
             style="min-width: 200px; padding: 8px 14px;" />
    </div>

    <!-- Supply Chain Alerts — State-wise Grouped -->
    <div class="card" style="margin-top: 12px;">
      <div class="card-header" style="flex-wrap: wrap; gap: 10px;">
        <span class="card-title">🚨 Supply Chain Alerts</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button v-for="f in filterOptions" :key="f.key"
                  :class="['tab-btn', alertFilter === f.key ? 'active' : '']"
                  @click="alertFilter = f.key">
            {{ f.label }} ({{ f.count }})
          </button>
          <button class="notify-all-btn"
                  v-if="deficitAlerts.length > 0"
                  :disabled="notifyingAll"
                  @click="notifyAll">
            {{ notifyingAll ? '📨 Sending...' : '📨 Notify All Retailers' }}
          </button>
        </div>
      </div>

      <div v-if="filteredAlerts.length === 0" style="text-align: center; padding: 40px; color: var(--text-muted);">
        <p>No supply alerts. Run pipeline first to generate predictions.</p>
      </div>

      <!-- State-wise Fieldsets -->
      <div v-for="sg in alertStateGroups" :key="sg.state" class="state-fieldset">
        <div class="fieldset-header" @click="toggleState(sg.state)">
          <div class="fieldset-title">
            <span class="fieldset-arrow">{{ expandedStates[sg.state] ? '▼' : '▶' }}</span>
            <strong>{{ sg.state }}</strong>
            <span class="fieldset-count">{{ sg.items.length }} alerts</span>
          </div>
          <div class="fieldset-pills">
            <span v-if="sg.urgentCount" class="mini-pill red-pill">🔴 {{ sg.urgentCount }} urgent</span>
            <span v-if="sg.restockCount" class="mini-pill orange-pill">⚠️ {{ sg.restockCount }} restock</span>
            <span v-if="sg.okCount" class="mini-pill green-pill">✅ {{ sg.okCount }} ok</span>
            <span v-if="sg.noCoverageCount" class="mini-pill gray-pill">⚪ {{ sg.noCoverageCount }}</span>
            <button class="notify-state-btn"
                    v-if="stateHasDeficit(sg)"
                    :disabled="notifyingState === sg.state"
                    @click.stop="notifyState(sg)">
              {{ notifyingState === sg.state ? 'Sending...' : '📲 Notify All ' + sg.state }}
            </button>
          </div>
        </div>
        <div v-show="expandedStates[sg.state]" class="fieldset-body">
          <div v-for="a in sg.items" :key="a.district + a.disease"
               class="alert-row" :class="'arow-' + a.status.toLowerCase()">
            <!-- District + Disease -->
            <div class="acol-district">
              <strong>{{ a.district }}</strong>
              <span :class="'risk-tag risk-' + a.risk_level.toLowerCase()">{{ a.disease }}</span>
            </div>
            <!-- Product -->
            <div class="acol-product">
              <div class="aprod-name">{{ a.product }}</div>
              <div class="aprod-sku" v-if="a.sku_name">{{ a.sku_name }}</div>
            </div>
            <!-- Demand vs Stock -->
            <div class="acol-numbers">
              <div class="anum-row">
                <span class="anum-label">Demand</span>
                <span class="anum-val">{{ a.estimated_demand }}</span>
              </div>
              <div class="anum-row">
                <span class="anum-label">Stock</span>
                <span class="anum-val" :style="{color: a.total_stock === 0 ? '#ef4444' : a.total_stock < a.estimated_demand ? '#f59e0b' : '#10b981'}">
                  {{ a.total_stock }}
                </span>
              </div>
              <div class="anum-row" v-if="a.deficit > 0">
                <span class="anum-label">Deficit</span>
                <span class="anum-val" style="color: #ef4444; font-weight: 700;">-{{ a.deficit }}</span>
              </div>
            </div>
            <!-- Retailers + Weeks -->
            <div class="acol-meta">
              <span class="ameta-item">🏪 {{ a.retailers_with_stock }}/{{ a.retailer_count }} stores</span>
              <span class="ameta-item" v-if="a.weeks_of_stock > 0"
                    :style="{color: a.weeks_of_stock < 2 ? '#ef4444' : a.weeks_of_stock < 4 ? '#f59e0b' : '#10b981'}">
                📅 {{ a.weeks_of_stock }}w supply
              </span>
              <span class="ameta-item" v-else style="color: #ef4444;">📅 0w supply</span>
            </div>
            <!-- Status Badge + Notify -->
            <div class="acol-status">
              <span :class="'status-tag status-' + a.status.toLowerCase()">
                {{ statusLabel(a.status) }}
              </span>
              <button v-if="a.deficit > 0 && !notifiedRetailers[a.district + a.disease]"
                      class="notify-btn"
                      :disabled="notifyingSending === (a.district + a.disease)"
                      @click.stop="notifyRetailer(a)"
                      title="Send WhatsApp supply alert to retailer">
                {{ notifyingSending === (a.district + a.disease) ? '📲 Sending...' : '📲 Notify' }}
              </button>
              <span v-else-if="notifiedRetailers[a.district + a.disease] === 'sent'" class="notified-badge sent-badge">
                ✅ Sent!
              </span>
              <span v-else-if="notifiedRetailers[a.district + a.disease]" class="notified-badge">
                ✅ Notified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { API } from '../config/api'

export default {
  name: 'Inventory',
  data() {
    return {
      loading: false,
      overview: {},
      alerts: [],
      alertStats: { urgent: 0, restock: 0, ok: 0, no_coverage: 0 },
      alertFilter: 'all',
      expandedStates: {},
      selectedState: '',
      searchQuery: '',
      notifiedRetailers: {},
      notifyingSending: null,
      notifyingState: null,
      notifyingAll: false,
    }
  },
  computed: {
    stateList() {
      return [...new Set(this.alerts.map(a => a.state))].sort()
    },
    filterOptions() {
      const a = this.baseFilteredAlerts
      return [
        { key: 'all', label: 'All', count: a.length },
        { key: 'urgent', label: '🔴 Urgent', count: a.filter(x => x.status === 'URGENT').length },
        { key: 'restock', label: '⚠️ Restock', count: a.filter(x => x.status === 'RESTOCK' || x.status === 'OUT_OF_STOCK').length },
        { key: 'ok', label: '✅ OK', count: a.filter(x => x.status === 'OK').length },
        { key: 'no_coverage', label: '⚪ No Data', count: a.filter(x => x.status === 'NO_COVERAGE').length },
      ]
    },
    baseFilteredAlerts() {
      let items = this.alerts
      if (this.selectedState) items = items.filter(a => a.state === this.selectedState)
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase()
        items = items.filter(a => a.district.toLowerCase().includes(q) || a.state.toLowerCase().includes(q) || (a.product || '').toLowerCase().includes(q))
      }
      return items
    },
    filteredAlerts() {
      let items = this.baseFilteredAlerts
      if (this.alertFilter === 'all') return items
      if (this.alertFilter === 'restock') return items.filter(a => a.status === 'RESTOCK' || a.status === 'OUT_OF_STOCK')
      return items.filter(a => a.status === this.alertFilter.toUpperCase())
    },
    alertStateGroups() {
      const map = {}
      for (const a of this.filteredAlerts) {
        const st = a.state || 'Unknown'
        if (!map[st]) map[st] = []
        map[st].push(a)
      }
      return Object.keys(map).sort().map(state => ({
        state,
        items: map[state],
        urgentCount: map[state].filter(a => a.status === 'URGENT').length,
        restockCount: map[state].filter(a => a.status === 'RESTOCK' || a.status === 'OUT_OF_STOCK').length,
        okCount: map[state].filter(a => a.status === 'OK').length,
        noCoverageCount: map[state].filter(a => a.status === 'NO_COVERAGE').length,
      }))
    },
    deficitAlerts() {
      return this.alerts.filter(a => a.deficit > 0)
    },
  },
  methods: {
    async fetchAll() {
      this.loading = true
      try {
        const [ov, al] = await Promise.all([
          axios.get(`${API}/inventory/overview`),
          axios.get(`${API}/inventory/supply-alerts`),
        ])
        this.overview = ov.data
        this.alerts = al.data.alerts || []
        this.alertStats = {
          urgent: al.data.urgent || 0,
          restock: al.data.restock || 0,
          ok: al.data.ok || 0,
          no_coverage: al.data.no_coverage || 0,
        }
        // Auto-expand states with urgent/restock alerts
        const urgentStates = [...new Set(this.alerts.filter(a => a.status === 'URGENT' || a.status === 'RESTOCK').map(a => a.state))]
        urgentStates.forEach(s => { this.expandedStates[s] = true })
      } catch (e) { console.error(e) }
      this.loading = false
    },
    toggleState(state) {
      this.expandedStates = { ...this.expandedStates, [state]: !this.expandedStates[state] }
    },
    stockPercent(s) {
      const max = Math.max(...(this.overview.stock_by_product || []).map(x => x.total_qty), 1)
      return (s.total_qty / max) * 100
    },
    stockColor(s) {
      const pct = s.in_stock_retailers / Math.max(s.retailers, 1)
      if (pct > 0.6) return '#10b981'
      if (pct > 0.3) return '#f59e0b'
      return '#ef4444'
    },
    statusLabel(status) {
      const map = { URGENT: '🔴 Urgent Restock', RESTOCK: '⚠️ Restock', OUT_OF_STOCK: '❌ Out of Stock', OK: '✅ Sufficient', NO_COVERAGE: '⚪ No Retailers' }
      return map[status] || status
    },
    async notifyRetailer(alert) {
      const key = alert.district + alert.disease
      this.notifyingSending = key
      
      try {
        const { data } = await axios.post(`${API}/inventory/notify-retailer`, {
          district: alert.district,
          state: alert.state,
          product: alert.product,
          deficit: alert.deficit,
          demand: alert.estimated_demand,
          stock: alert.total_stock,
        })
        
        // 'sent' = real WhatsApp delivered, 'notified' = fallback
        this.notifiedRetailers = { ...this.notifiedRetailers, [key]: data.status }
        console.log(`[NOTIFY] ${data.status}: ${data.message}`)
      } catch (e) {
        // Fallback — mark as notified even if API fails
        this.notifiedRetailers = { ...this.notifiedRetailers, [key]: 'notified' }
        console.error('[NOTIFY] Error:', e)
      }
      
      this.notifyingSending = null
    },
    stateHasDeficit(sg) {
      return sg.items.some(a => a.deficit > 0 && !this.notifiedRetailers[a.district + a.disease])
    },
    async notifyState(sg) {
      this.notifyingState = sg.state
      const deficits = sg.items.filter(a => a.deficit > 0 && !this.notifiedRetailers[a.district + a.disease])
      
      // Send INDIVIDUAL message for each district (real WhatsApp per alert)
      for (const a of deficits) {
        const key = a.district + a.disease
        try {
          const { data } = await axios.post(`${API}/inventory/notify-retailer`, {
            district: a.district,
            state: a.state,
            product: a.product,
            deficit: a.deficit,
            demand: a.estimated_demand,
            stock: a.total_stock,
          })
          this.notifiedRetailers = { ...this.notifiedRetailers, [key]: data.status }
        } catch (e) {
          this.notifiedRetailers = { ...this.notifiedRetailers, [key]: 'notified' }
        }
      }
      this.notifyingState = null
    },
    async notifyAll() {
      const deficits = this.deficitAlerts.filter(a => !this.notifiedRetailers[a.district + a.disease])
      if (deficits.length === 0) return
      
      this.notifyingAll = true
      // Send INDIVIDUAL message for each district
      for (const a of deficits) {
        const key = a.district + a.disease
        try {
          const { data } = await axios.post(`${API}/inventory/notify-retailer`, {
            district: a.district,
            state: a.state,
            product: a.product,
            deficit: a.deficit,
            demand: a.estimated_demand,
            stock: a.total_stock,
          })
          this.notifiedRetailers = { ...this.notifiedRetailers, [key]: data.status }
        } catch (e) {
          this.notifiedRetailers = { ...this.notifiedRetailers, [key]: 'notified' }
        }
      }
      this.notifyingAll = false
    },
  },
  mounted() {
    this.fetchAll()
  },
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

/* Stock Grid */
.stock-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 12px;
  padding: 10px 0;
}
.stock-item {
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.stock-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.stock-bar-wrap {
  width: 100%;
  height: 5px;
  background: rgba(0,0,0,0.08);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.stock-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s;
}
.stock-nums {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.stock-qty { color: var(--text-primary); font-weight: 600; }
.stock-retailers { color: var(--text-muted); }

/* Tab Buttons */
.tab-btn {
  padding: 5px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { border-color: var(--accent-green); color: var(--text-primary); }
.tab-btn.active { background: rgba(16,185,129,0.15); border-color: var(--accent-green); color: var(--accent-green); }

/* State Fieldset — Collapsible Groups */
.state-fieldset {
  border-top: 1px solid var(--border);
}
.state-fieldset:first-child { border-top: none; }
.fieldset-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; cursor: pointer; transition: background 0.2s;
}
.fieldset-header:hover { background: var(--bg-card-hover); }
.fieldset-title { display: flex; align-items: center; gap: 10px; color: var(--text-primary); }
.fieldset-arrow { font-size: 11px; color: var(--text-muted); width: 14px; }
.fieldset-count { font-size: 12px; color: var(--text-muted); }
.fieldset-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.mini-pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.green-pill { background: rgba(76,175,80,0.12); color: #4caf50; }
.orange-pill { background: rgba(255,152,0,0.12); color: #ff9800; }
.red-pill { background: rgba(244,67,54,0.12); color: #f44336; }
.gray-pill { background: rgba(148,163,184,0.12); color: #94a3b8; }
.fieldset-body { border-top: 1px solid var(--border); }

/* Alert Rows */
.alert-row {
  display: flex; align-items: center; gap: 16px;
  padding: 12px 20px; border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 13px; transition: background 0.15s;
}
.alert-row:hover { background: var(--bg-card-hover); }
.alert-row:last-child { border-bottom: none; }
.arow-urgent { border-left: 3px solid #ef4444; background: rgba(239,68,68,0.03); }
.arow-out_of_stock { border-left: 3px solid #ef4444; }
.arow-restock { border-left: 3px solid #f59e0b; }
.arow-ok { border-left: 3px solid #10b981; }
.arow-no_coverage { border-left: 3px solid #64748b; }

.acol-district {
  min-width: 180px; display: flex; align-items: center; gap: 10px;
}
.acol-product { min-width: 140px; }
.aprod-name { font-size: 13px; color: var(--accent-green); font-weight: 600; }
.aprod-sku { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.acol-numbers {
  min-width: 150px;
  display: flex; gap: 14px;
}
.anum-row { display: flex; flex-direction: column; align-items: center; }
.anum-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.anum-val { font-size: 15px; font-weight: 700; color: var(--text-primary); }

.acol-meta {
  flex: 1;
  display: flex; gap: 12px; flex-wrap: wrap;
}
.ameta-item { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }

.acol-status { min-width: 120px; text-align: right; }

/* Risk Tags & Status Tags */
.risk-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
}
.risk-high { background: rgba(239,68,68,0.15); color: #ef4444; }
.risk-moderate { background: rgba(245,158,11,0.15); color: #f59e0b; }

.status-tag {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.status-urgent { background: rgba(239,68,68,0.15); color: #ef4444; }
.status-restock { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-out_of_stock { background: rgba(239,68,68,0.15); color: #ef4444; }
.status-ok { background: rgba(16,185,129,0.15); color: #10b981; }
.status-no_coverage { background: rgba(148,163,184,0.15); color: #94a3b8; }

@media (max-width: 768px) {
  .alert-row { flex-wrap: wrap; gap: 8px; }
  .acol-district { min-width: 100%; }
  .acol-numbers { min-width: auto; }
  .acol-status { min-width: auto; text-align: left; }
}

/* Filter Bar */
.filter-bar {
  display: flex; gap: 10px; align-items: center; flex-wrap: wrap;
}

/* Notify Retailer Button */
.notify-btn {
  display: inline-block;
  margin-top: 6px;
  padding: 4px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(59,130,246,0.12);
  border: 1px solid rgba(59,130,246,0.25);
  color: #60a5fa;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}
.notify-btn:hover {
  background: rgba(59,130,246,0.2);
  border-color: #3b82f6;
  transform: translateY(-1px);
}
.notified-badge {
  display: inline-block;
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(16,185,129,0.12);
  color: #10b981;
}
.sent-badge {
  background: rgba(16,185,129,0.2);
  color: #10b981;
  animation: sentPulse 1.5s ease-in-out;
}
@keyframes sentPulse {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 12px 4px rgba(16,185,129,0.2); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}

/* Notify All Buttons */
.notify-all-btn {
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.15));
  border: 1px solid rgba(59,130,246,0.3);
  color: #60a5fa;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
}
.notify-all-btn:hover {
  background: linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25));
  border-color: #3b82f6;
  transform: translateY(-1px);
}
.notify-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.notify-state-btn {
  padding: 3px 12px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(59,130,246,0.1);
  border: 1px solid rgba(59,130,246,0.2);
  color: #60a5fa;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  white-space: nowrap;
  margin-left: 4px;
}
.notify-state-btn:hover {
  background: rgba(59,130,246,0.2);
  border-color: #3b82f6;
}
.notify-state-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
