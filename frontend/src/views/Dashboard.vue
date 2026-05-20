<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>Dashboard</h2>
        <p class="subtitle">KrishiConnect AI - Real-time Agricultural Intelligence</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <select v-model="selectedState" style="min-width: 160px;">
          <option value="">All India</option>
          <option v-for="s in stateList" :key="s" :value="s">{{ s }}</option>
        </select>
        <button class="btn btn-primary" @click="runPipeline(false)" :disabled="loading">
          {{ loading ? 'Running...' : '▶ Run Pipeline' }}
        </button>
        <button class="btn btn-syngenta" @click="runPipeline(true)" :disabled="loading">
          {{ loading ? 'Running...' : '🔬 Real System Run (Syngenta 33)' }}
        </button>
      </div>
    </div>

    <!-- Streaming Progress Bar -->
    <div v-if="loading" class="card" style="margin-bottom: 16px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
        <span style="font-weight: 600; font-size: 13px;">{{ store.phase }}</span>
        <span style="font-size: 12px; color: var(--text-muted);">{{ store.progress }}/{{ store.total }} districts</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div v-if="store.latest" style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
        Latest: <strong>{{ store.latest }}</strong>
      </div>
    </div>

    <!-- Stats Grid — Syngenta Network Overview -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-label">👨‍🌾 Farmer Network</div>
        <div class="stat-value">{{ (stats.farmer_count || 0).toLocaleString() }}</div>
        <div class="stat-sub">📱 {{ stats.smartphone_pct || 0 }}% smartphones · {{ stats.avg_farm_size || 0 }} acres avg</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">🏪 Retailer Network</div>
        <div class="stat-value">{{ (stats.retailer_count || 0).toLocaleString() }}</div>
        <div class="stat-sub">{{ stats.districts || 0 }} districts · {{ stats.states || 0 }} states</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">📨 Campaigns</div>
        <div class="stat-value">{{ stats.campaigns_total || 0 }}</div>
        <div class="stat-sub">✅ {{ stats.campaigns_sent || 0 }} sent · ⏳ {{ stats.campaigns_pending || 0 }} pending</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">🌾 Acreage Monitored</div>
        <div class="stat-value">{{ ((stats.total_acreage || 0) / 1000).toFixed(0) }}K</div>
        <div class="stat-sub">{{ (stats.total_acreage || 0).toLocaleString() }} acres total</div>
      </div>
    </div>

    <!-- Key Agricultural Intelligence -->
    <div class="intel-section" v-if="stats.top_risk_crop || stats.top_disease">
      <div class="intel-header">🔬 Key Agricultural Intelligence</div>
      <div class="intel-grid">
        <!-- Top Risk Crop -->
        <div class="intel-card" v-if="stats.top_risk_crop">
          <div class="intel-icon">🌾</div>
          <div class="intel-body">
            <div class="intel-label">Top At-Risk Crop</div>
            <div class="intel-val">{{ stats.top_risk_crop.crop }}</div>
            <div class="intel-meta">{{ stats.top_risk_crop.districts }} districts at risk</div>
          </div>
        </div>
        <!-- Top Disease -->
        <div class="intel-card" v-if="stats.top_disease">
          <div class="intel-icon">🦠</div>
          <div class="intel-body">
            <div class="intel-label">Top Disease Threat</div>
            <div class="intel-val">{{ stats.top_disease.disease }}</div>
            <div class="intel-meta">{{ stats.top_disease.count }} campaigns triggered</div>
          </div>
        </div>
        <!-- Most Demanded Product -->
        <div class="intel-card" v-if="stats.top_product">
          <div class="intel-icon">💊</div>
          <div class="intel-body">
            <div class="intel-label">Most Demanded Product</div>
            <div class="intel-val">{{ stats.top_product.product }}</div>
            <div class="intel-meta">{{ stats.top_product.count }} campaigns linked</div>
          </div>
        </div>
        <!-- Hottest State -->
        <div class="intel-card" v-if="stats.hottest_state">
          <div class="intel-icon">📍</div>
          <div class="intel-body">
            <div class="intel-label">Highest Risk State</div>
            <div class="intel-val">{{ stats.hottest_state.state }}</div>
            <div class="intel-meta">{{ stats.hottest_state.count }} at-risk districts</div>
          </div>
        </div>
      </div>

      <!-- Mini Bar Charts -->
      <div class="intel-charts" v-if="stats.top_risk_states && stats.top_risk_states.length">
        <!-- Top States -->
        <div class="mini-chart">
          <div class="mc-title">📍 At-Risk States</div>
          <div v-for="s in stats.top_risk_states" :key="s.state" class="mc-row">
            <span class="mc-label">{{ s.state }}</span>
            <div class="mc-bar-bg">
              <div class="mc-bar mc-bar-red" :style="{width: barPct(s.count, stats.top_risk_states) + '%'}"></div>
            </div>
            <span class="mc-val">{{ s.count }}</span>
          </div>
        </div>
        <!-- Top Diseases -->
        <div class="mini-chart" v-if="stats.top_diseases && stats.top_diseases.length">
          <div class="mc-title">🦠 Disease Distribution</div>
          <div v-for="d in stats.top_diseases" :key="d.disease" class="mc-row">
            <span class="mc-label">{{ d.disease }}</span>
            <div class="mc-bar-bg">
              <div class="mc-bar mc-bar-orange" :style="{width: barPct(d.count, stats.top_diseases) + '%'}"></div>
            </div>
            <span class="mc-val">{{ d.count }}</span>
          </div>
        </div>
        <!-- Top Products -->
        <div class="mini-chart" v-if="stats.top_products && stats.top_products.length">
          <div class="mc-title">💊 Product Demand</div>
          <div v-for="p in stats.top_products" :key="p.product" class="mc-row">
            <span class="mc-label">{{ p.product }}</span>
            <div class="mc-bar-bg">
              <div class="mc-bar mc-bar-green" :style="{width: barPct(p.count, stats.top_products) + '%'}"></div>
            </div>
            <span class="mc-val">{{ p.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Farmer Engagement Intelligence -->
    <div class="engagement-section" v-if="stats.feedback_received > 0">
      <div class="eng-header">
        <span class="eng-title">📩 Farmer Engagement Intelligence</span>
        <router-link to="/campaigns" class="btn btn-outline btn-sm" @click.native="setTimeout(() => {}, 100)">View All Responses →</router-link>
      </div>
      <div class="eng-stats-row">
        <div class="eng-stat-card accent-green">
          <div class="eng-icon">📊</div>
          <div class="eng-num">{{ stats.engagement_rate || 0 }}%</div>
          <div class="eng-lbl">Engagement Rate</div>
        </div>
        <div class="eng-stat-card accent-blue">
          <div class="eng-icon">📩</div>
          <div class="eng-num">{{ stats.feedback_received || 0 }}</div>
          <div class="eng-lbl">Farmer Responses</div>
        </div>
        <div class="eng-stat-card accent-orange">
          <div class="eng-icon">🔥</div>
          <div class="eng-num">{{ stats.high_value_leads || 0 }}</div>
          <div class="eng-lbl">High-Value Leads</div>
        </div>
        <div class="eng-stat-card accent-purple">
          <div class="eng-icon">🛒</div>
          <div class="eng-num">{{ stats.buy_intent_leads || 0 }}</div>
          <div class="eng-lbl">Buy Intent</div>
        </div>
        <div class="eng-stat-card accent-red">
          <div class="eng-icon">🔴</div>
          <div class="eng-num">{{ stats.field_issues || 0 }}</div>
          <div class="eng-lbl">Field Issues</div>
        </div>
      </div>
    </div>

    <!-- Pipeline Health Report — State-wise Grouped -->
    <div v-if="pipelineResult" class="fade-in" style="margin-top: 8px;">
      <!-- Report Header -->
      <div class="card" style="margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="card-title" style="font-size: 18px;">📊 Pipeline Health Report</span>
            <span v-if="pipelineResult.mode === 'syngenta_real'" class="syngenta-mode-badge">🔬 Syngenta Real Data</span>
            <span style="font-size: 13px; color: var(--text-muted); margin-left: 12px;">
              {{ pipelineResult.state_filter }} · {{ pipelineResult.season }}
            </span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="health-badge all">{{ pipelineResult.total_districts }} Districts</span>
            <span class="health-badge healthy">✅ {{ pipelineResult.healthy }} Healthy</span>
            <span class="health-badge advisory">💡 {{ advisoryCount }} Advisory</span>
            <span class="health-badge medium">⚠️ {{ moderateCount }} Moderate</span>
            <span class="health-badge high">🔴 {{ highCount }} High</span>
          </div>
        </div>
      </div>

      <!-- Filter Tabs + Search -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; gap: 6px;">
          <button v-for="f in healthFilters" :key="f.key"
                  :class="['health-filter-btn', healthFilter === f.key ? 'active ' + f.key : '']"
                  @click="healthFilter = f.key">
            {{ f.label }} ({{ f.count }})
          </button>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <select v-model="healthStateFilter" class="state-dropdown">
            <option value="">All States</option>
            <option v-for="s in healthStateList" :key="s" :value="s">{{ s }}</option>
          </select>
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" @click="expandAllStates">Expand All States</button>
          <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" @click="collapseAllStates">Collapse All</button>
          <input type="text" v-model="healthSearch" placeholder="Search district..."
                 style="min-width: 200px; padding: 8px 14px;" />
        </div>
      </div>
      <p v-if="allHealth.length > 0" style="font-size: 12px; color: var(--text-muted); margin: -8px 0 12px;">
        Showing {{ filteredHealth.length }} of {{ allHealth.length }} districts — click a state header to expand/collapse
      </p>

      <!-- State-wise Fieldsets -->
      <div v-for="sg in filteredStateGroups" :key="sg.state" class="state-fieldset">
        <div class="fieldset-header" @click="toggleState(sg.state)">
          <div class="fieldset-title">
            <span class="fieldset-arrow">{{ expandedStates[sg.state] ? '▼' : '▶' }}</span>
            <strong>{{ sg.state }}</strong>
            <span class="fieldset-count">{{ sg.items.length }} districts</span>
          </div>
          <div class="fieldset-summary">
            <span v-if="sg.healthyCount" class="mini-badge healthy">✅ {{ sg.healthyCount }}</span>
            <span v-if="sg.advisoryCount" class="mini-badge advisory">💡 {{ sg.advisoryCount }}</span>
            <span v-if="sg.moderateCount" class="mini-badge medium">⚠️ {{ sg.moderateCount }}</span>
            <span v-if="sg.highCount" class="mini-badge high">🔴 {{ sg.highCount }}</span>
          </div>
        </div>
        <div v-show="expandedStates[sg.state]" class="fieldset-body">
          <div v-for="h in sg.items" :key="h.district + '-' + h.state" class="health-row-wrapper" :class="'row-' + h.color">
            <div class="health-row">
              <div class="health-district">
                <strong>{{ h.district }}</strong>
              </div>
              <div class="health-status-col">
                <span :class="'status-dot dot-' + h.color"></span>
                {{ h.status === 'healthy' ? 'Healthy' : h.risk_level || 'At Risk' }}
              </div>
              <div class="health-details">
                <template v-if="h.status === 'healthy'">
                  <span style="color: var(--accent-green); font-size: 12px;">No disease risk detected</span>
                </template>
                <template v-else>
                  <span style="font-size: 12px;">{{ h.crop }} → <strong>{{ h.disease }}</strong> ({{ (h.probability * 100).toFixed(0) }}%)</span>
                  <span style="font-size: 11px; color: var(--accent-green); display: block;">Rx: {{ h.product }}</span>
                </template>
              </div>
              <div class="health-weather" v-if="h.weather">
                {{ h.weather.temp?.toFixed(1) }}°C · {{ h.weather.humidity?.toFixed(0) }}% · {{ h.weather.rainfall?.toFixed(0) }}mm
              </div>
              <div v-if="h.campaign_id" class="health-action">
                <span class="badge badge-pending" style="cursor: pointer; font-size: 11px;"
                      @click="$router.push('/campaigns')">
                  Campaign #{{ h.campaign_id }}
                </span>
              </div>
            </div>
            <!-- Syngenta Enrichment Row -->
            <div v-if="h.syngenta" class="syngenta-enrichment">
              <span class="syn-chip">👨‍🌾 {{ h.syngenta.grower_count }} farmers</span>
              <span class="syn-chip">🌾 {{ h.syngenta.avg_farm_size }} acres avg</span>
              <span class="syn-chip">📱 {{ h.syngenta.smartphones }} smartphones</span>
              <span class="syn-chip">🏪 {{ h.syngenta.retailer_count }} retailers</span>
              <span v-if="h.syngenta.product_stock" class="syn-chip stock">
                📦 {{ h.syngenta.product_stock }} units @ {{ h.syngenta.stock_retailers }} retailers
              </span>
              <span v-if="h.syngenta.product_stock === undefined && h.product" class="syn-chip no-stock">
                ⚠️ Stock data N/A
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredStateGroups.length === 0" class="card" style="text-align: center; padding: 30px; color: var(--text-muted);">
        No results match your filter.
      </div>
    </div>

    <!-- Recent Campaigns + Quick Actions -->
    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent Campaigns</span>
          <router-link to="/campaigns" class="btn btn-outline btn-sm">View All</router-link>
        </div>
        <div v-if="campaigns.length === 0" class="loading">No campaigns yet. Run the pipeline!</div>
        <div v-for="c in campaigns.slice(0, 5)" :key="c.id"
             style="padding: 12px 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 13px; font-weight: 500;">{{ c.district_name || 'District' }} - {{ c.crop }}</div>
            <div style="font-size: 12px; color: var(--text-muted);">{{ c.disease }} | {{ c.product }}</div>
          </div>
          <span :class="'badge badge-' + (c.status || 'pending')">{{ c.status }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick Actions</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-outline" @click="approveAll">Approve All Pending Campaigns</button>
          <button class="btn btn-outline" @click="runNDVI">Run NDVI Satellite Scan</button>
          <button class="btn btn-outline" @click="fetchWeatherTest">Test Weather API</button>
        </div>
        <div v-if="weatherTest" style="margin-top: 16px; padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-sm); font-size: 12px;">
          <div style="color: var(--accent-blue); font-weight: 600;">Weather Test - {{ weatherTest.location }}</div>
          <div style="color: var(--text-secondary); margin-top: 4px;">
            Temp: {{ weatherTest.result?.summary?.avg_temp }}°C |
            Humidity: {{ weatherTest.result?.summary?.avg_humidity }}% |
            Rain: {{ weatherTest.result?.summary?.total_rainfall }}mm
          </div>
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
  name: 'Dashboard',
  data() {
    return {
      stats: {},
      campaigns: [],
      weatherTest: null,
      selectedState: '',
      stateList: [],
      healthFilter: 'all',
      healthSearch: '',
      healthStateFilter: '',
      store: pipelineStore,  // global store reference
    }
  },
  computed: {
    loading() { return this.store.running },
    pipelineResult() { return this.store.result },
    expandedStates: {
      get() { return this.store.expandedStates },
      set(v) { this.store.expandedStates = v },
    },
    allHealth() {
      return this.store.result?.district_health || []
    },
    progressPercent() {
      return this.store.progressPercent
    },
    advisoryCount() {
      return this.allHealth.filter(h => h.risk_level === 'ADVISORY').length
    },
    moderateCount() {
      return this.allHealth.filter(h => h.risk_level === 'MODERATE').length
    },
    highCount() {
      return this.allHealth.filter(h => h.risk_level === 'HIGH').length
    },
    healthFilters() {
      const all = this.allHealth
      return [
        { key: 'all', label: 'All', count: all.length },
        { key: 'healthy', label: '✅ Healthy', count: all.filter(h => h.status === 'healthy').length },
        { key: 'advisory', label: '💡 Advisory', count: this.advisoryCount },
        { key: 'moderate', label: '⚠️ Moderate', count: this.moderateCount },
        { key: 'high', label: '🔴 High', count: this.highCount },
      ]
    },
    filteredHealth() {
      let items = this.allHealth
      if (this.healthFilter === 'healthy') items = items.filter(h => h.status === 'healthy')
      else if (this.healthFilter === 'advisory') items = items.filter(h => h.risk_level === 'ADVISORY')
      else if (this.healthFilter === 'moderate') items = items.filter(h => h.risk_level === 'MODERATE')
      else if (this.healthFilter === 'high') items = items.filter(h => h.risk_level === 'HIGH')
      if (this.healthStateFilter) {
        items = items.filter(h => h.state === this.healthStateFilter)
      }
      if (this.healthSearch) {
        const q = this.healthSearch.toLowerCase()
        items = items.filter(h => h.district?.toLowerCase().includes(q) || h.state?.toLowerCase().includes(q))
      }
      return items
    },
    healthStateList() {
      const states = [...new Set(this.allHealth.map(h => h.state).filter(Boolean))]
      return states.sort()
    },
    filteredStateGroups() {
      const map = {}
      for (const h of this.filteredHealth) {
        const st = h.state || 'Unknown'
        if (!map[st]) map[st] = []
        map[st].push(h)
      }
      return Object.keys(map).sort().map(state => ({
        state,
        items: map[state],
        healthyCount: map[state].filter(h => h.status === 'healthy').length,
        advisoryCount: map[state].filter(h => h.risk_level === 'ADVISORY').length,
        moderateCount: map[state].filter(h => h.risk_level === 'MODERATE').length,
        highCount: map[state].filter(h => h.risk_level === 'HIGH').length,
      }))
    },
  },
  mounted() {
    this.fetchStats()
    this.fetchCampaigns()
    this.fetchStates()
    // Only auto-load from DB if store has no results yet
    if (!this.store.result) this.loadLastResults()
  },
  methods: {
    toggleState(state) {
      this.store.expandedStates = {
        ...this.store.expandedStates,
        [state]: !this.store.expandedStates[state],
      }
    },
    expandAllStates() {
      const expanded = {}
      for (const h of this.allHealth) {
        if (h.state) expanded[h.state] = true
      }
      this.store.expandedStates = expanded
    },
    collapseAllStates() {
      this.store.expandedStates = {}
    },
    mapOverviewDistricts(rows) {
      return (rows || []).map(d => ({
        district: d.district,
        state: d.state,
        status: d.status,
        status_label: d.status === 'healthy'
          ? 'Crop Healthy — No Risk Detected'
          : `${d.disease} — ${d.risk_level}`,
        color: d.color || (d.status === 'healthy' ? 'green' : 'red'),
        crop: d.crop,
        disease: d.disease,
        risk_level: d.risk_level,
        probability: d.probability,
        product: d.product,
        weather: d.weather?.avg_temp != null
          ? { temp: d.weather.avg_temp, humidity: d.weather.avg_humidity, rainfall: d.weather.total_rainfall }
          : d.weather,
        campaign_id: d.campaign_id,
      }))
    },
    async loadLastResults(expandAll = false, syngentaOnly = false) {
      try {
        let url = `${API}/overview/health`
        if (syngentaOnly) url += '?syngenta_only=true'
        const { data } = await axios.get(url)
        const streamed = this.store.result?.district_health || []
        const key = (h) => `${h.district}|${h.state}`
        const merged = new Map()
        if (data.districts?.length) {
          for (const d of this.mapOverviewDistricts(data.districts)) {
            merged.set(key(d), d)
          }
        }
        for (const d of streamed) {
          if (!merged.has(key(d))) merged.set(key(d), d)
        }
        const mapped = Array.from(merged.values())
        if (mapped.length > 0) {
          const mode = syngentaOnly ? 'syngenta_real' : (this.store.result?.mode || 'standard')
          this.store.result = {
            ...this.store.result,
            mode,
            district_health: mapped,
            total_districts: syngentaOnly ? (data.expected_syngenta || 33) : (data.stats?.total || mapped.length),
            healthy: mapped.filter(d => d.status === 'healthy').length,
            at_risk: mapped.filter(d => d.status === 'at_risk').length,
            campaigns_created: mapped.filter(d => d.campaign_id).length,
            season: this.store.result?.season || 'Last Run',
            state_filter: syngentaOnly ? 'Syngenta 33 Districts' : (this.store.result?.state_filter || 'All India'),
          }
          if (expandAll) {
            this.expandAllStates()
          } else {
            const risky = [...new Set(mapped.filter(d => d.status === 'at_risk').map(d => d.state))]
            const expanded = {}
            risky.slice(0, 3).forEach(s => { expanded[s] = true })
            this.store.expandedStates = expanded
          }
        }
      } catch (e) { console.error('Auto-load error:', e) }
    },
    async fetchStates() {
      try {
        const { data } = await axios.get(`${API}/states`)
        this.stateList = (data.states || []).map(s => s.state).sort()
      } catch (e) { console.error('States error:', e) }
    },
    async fetchStats() {
      try {
        const { data } = await axios.get(`${API}/dashboard/stats`)
        this.stats = data
      } catch (e) { console.error('Stats error:', e) }
    },
    async fetchCampaigns() {
      try {
        const { data } = await axios.get(`${API}/campaign/list?limit=10`)
        this.campaigns = data.campaigns || []
      } catch (e) { console.error('Campaigns error:', e) }
    },
    async runPipeline(syngentaMode = false) {
      const s = this.store
      s.startRun()
      s.result.mode = syngentaMode ? 'syngenta_real' : 'standard'

      const usePolling = import.meta.env.PROD
        || (import.meta.env.VITE_USE_PIPELINE_POLLING || '').toLowerCase() === 'true'

      if (usePolling) {
        await this.runPipelinePolling(syngentaMode)
      } else {
        this.runPipelineSSE(syngentaMode)
      }
    },
    handlePipelineEvent(msg) {
      const s = this.store
      if (msg.type === 'error') {
        alert(msg.message)
        return 'error'
      }
      if (msg.type === 'init') {
        s.total = msg.total
        s.result.season = msg.season
        s.result.state_filter = msg.state_filter
        s.result.total_districts = msg.total
      } else if (msg.type === 'phase') {
        s.phase = msg.message
      } else if (msg.type === 'district') {
        s.progress = msg.progress
        s.latest = `${msg.data.district}, ${msg.data.state}`
        s.result.district_health.push(msg.data)
        if (msg.data.status === 'healthy') s.result.healthy++
        else if (msg.data.status === 'at_risk') s.result.at_risk++
        const st = msg.data.state
        const expandedCount = Object.keys(s.expandedStates).length
        if (expandedCount < 3 && !s.expandedStates[st]) {
          s.expandedStates[st] = true
        }
      } else if (msg.type === 'campaign_linked') {
        const match = s.result.district_health.find(
          h => h.district === msg.district && h.state === msg.state
        )
        if (match) match.campaign_id = msg.campaign_id
      } else if (msg.type === 'complete') {
        s.result.campaigns_created = msg.summary.campaigns_created
        const skipped = msg.summary.skipped_unchanged || msg.summary.skipped_cached || 0
        let label = `✅ Complete — ${msg.summary.total} districts`
        if (skipped > 0) label += ` (${skipped} unchanged — no duplicates)`
        s.phase = label
        return 'complete'
      }
      return 'ok'
    },
    async runPipelinePolling(syngentaMode) {
      const s = this.store
      const body = { limit: 1000, syngenta_only: syngentaMode }
      if (this.selectedState) body.state = this.selectedState

      try {
        const { data: start } = await axios.post(`${API}/campaign/start-async`, body)
        if (start.error) {
          alert(start.error)
          s.finish()
          return
        }

        const jobId = start.job_id
        let since = 0
        const syngenta = syngentaMode

        const poll = async () => {
          if (!s.running) return
          try {
            const { data } = await axios.get(`${API}/campaign/job/${jobId}`, { params: { since } })
            since = data.next_since
            for (const msg of data.events || []) {
              this.handlePipelineEvent(msg)
            }
            if (data.status === 'complete' || data.status === 'error') {
              if (s._pollTimer) {
                clearInterval(s._pollTimer)
                s._pollTimer = null
              }
              if (data.status === 'complete') {
                s.finish()
                this.fetchStats()
                this.fetchCampaigns()
                this.loadLastResults(true, syngenta)
              } else {
                s.phase = `❌ ${data.error || 'Pipeline failed'}`
                if (data.error) alert(data.error)
                s.finish()
                this.loadLastResults(true, syngenta)
              }
            }
          } catch (e) {
            console.error(e)
            s.phase = '❌ Connection lost — loading saved results from database...'
            s.finish()
            this.loadLastResults(true, syngenta)
          }
        }

        await poll()
        s._pollTimer = setInterval(poll, 1500)
      } catch (e) {
        console.error(e)
        s.phase = '❌ Failed to start pipeline'
        s.finish()
      }
    },
    runPipelineSSE(syngentaMode) {
      const s = this.store
      let url = `${API}/campaign/stream?limit=1000`
      if (this.selectedState) url += `&state=${encodeURIComponent(this.selectedState)}`
      if (syngentaMode) url += '&syngenta_only=true'

      const source = new EventSource(url)
      s._source = source

      source.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        const outcome = this.handlePipelineEvent(msg)
        if (outcome === 'error') {
          s.finish()
        } else if (outcome === 'complete') {
          s.finish()
          this.fetchStats()
          this.fetchCampaigns()
          this.loadLastResults(true, s.result.mode === 'syngenta_real')
        }
      }

      source.onerror = () => {
        s.phase = '❌ Connection lost — loading saved results from database...'
        s.finish()
        this.loadLastResults(true, s.result.mode === 'syngenta_real')
      }
    },
    async approveAll() {
      const count = this.pipelineResult?.campaigns_created || this.stats.campaigns_pending || '?'
      if (!confirm(`Approve & Send ALL ${count} campaigns?\nHar campaign ke 4 messages (SMS, WhatsApp, Voice, Poster) jaayenge.\n\nContinue?`)) return
      try {
        const { data } = await axios.post(`${API}/campaign/approve`, { auto: true, send_now: true })
        const delivered = data.delivered?.length || 0
        alert(`Approved ${data.approved} campaigns! Delivered: ${delivered}`)
        this.fetchCampaigns()
      } catch (e) { console.error(e) }
    },
    async runNDVI() {
      try {
        const { data } = await axios.post(`${API}/ndvi/scan`, { points: 25 })
        alert(`NDVI Scan: ${data.total_points} points, ${data.stressed_points} stressed!`)
      } catch (e) { console.error(e) }
    },
    async fetchWeatherTest() {
      try {
        const { data } = await axios.get(`${API}/weather/test`)
        this.weatherTest = data
      } catch (e) { console.error(e) }
    },
    barPct(val, arr) {
      const max = Math.max(...arr.map(x => x.count || x.cnt || 0), 1)
      return Math.round((val / max) * 100)
    },
  }
}
</script>

<style scoped>
/* Streaming Progress Bar */
.progress-bar-bg {
  width: 100%; height: 8px; border-radius: 4px;
  background: var(--bg-secondary); overflow: hidden;
}
.progress-bar-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, #4caf50, #81c784);
  transition: width 0.3s ease;
}

/* Health Report Badges */
.health-badge {
  padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;
}
.health-badge.all { background: var(--accent-blue-glow); color: var(--accent-blue); }
.health-badge.healthy { background: rgba(76,175,80,0.15); color: #4caf50; }
.health-badge.advisory { background: rgba(234,179,8,0.15); color: #eab308; }
.health-badge.medium { background: rgba(255,152,0,0.15); color: #ff9800; }
.health-badge.high { background: rgba(244,67,54,0.15); color: #f44336; }

/* Filter Buttons */
.health-filter-btn {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  background: var(--bg-secondary); border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.health-filter-btn:hover { border-color: var(--accent-green); color: var(--text-primary); }
.health-filter-btn.active.all { background: var(--accent-blue-glow); border-color: var(--accent-blue); color: var(--accent-blue); }
.health-filter-btn.active.healthy { background: rgba(76,175,80,0.15); border-color: #4caf50; color: #4caf50; }
.health-filter-btn.active.advisory { background: rgba(234,179,8,0.15); border-color: #eab308; color: #eab308; }
.health-filter-btn.active.moderate { background: rgba(255,152,0,0.15); border-color: #ff9800; color: #ff9800; }
.health-filter-btn.active.high { background: rgba(244,67,54,0.15); border-color: #f44336; color: #f44336; }

/* State Fieldsets */
.state-fieldset {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 12px;
  overflow: hidden;
}
.fieldset-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; cursor: pointer; transition: background 0.2s;
}
.fieldset-header:hover { background: var(--bg-card-hover); }
.fieldset-title { display: flex; align-items: center; gap: 10px; }
.fieldset-arrow { font-size: 11px; color: var(--text-muted); width: 14px; }
.fieldset-count { font-size: 12px; color: var(--text-muted); margin-left: 4px; }
.fieldset-summary { display: flex; gap: 6px; }
.mini-badge {
  padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
}
.mini-badge.healthy { background: rgba(76,175,80,0.12); color: #4caf50; }
.mini-badge.advisory { background: rgba(234,179,8,0.12); color: #eab308; }
.mini-badge.medium { background: rgba(255,152,0,0.12); color: #ff9800; }
.mini-badge.high { background: rgba(244,67,54,0.12); color: #f44336; }

.fieldset-body { border-top: 1px solid var(--border); }

/* Health Row Wrapper (carries border-left color) */
.health-row-wrapper {
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.15s;
}
.health-row-wrapper:hover { background: var(--bg-card-hover); }
.health-row-wrapper:last-child { border-bottom: none; }
.row-green { border-left: 3px solid #4caf50; }
.row-yellow { border-left: 3px solid #eab308; }
.row-orange { border-left: 3px solid #ff9800; }
.row-red { border-left: 3px solid #f44336; }

/* Health Row (inner flex layout) */
.health-row {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 20px;
  font-size: 13px;
}

.health-district { min-width: 140px; }
.health-status-col {
  min-width: 90px; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;
}
.status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dot-green { background: #4caf50; }
.dot-yellow { background: #eab308; }
.dot-orange { background: #ff9800; }
.dot-red { background: #f44336; }
.health-details { flex: 1; color: var(--text-secondary); }
.health-weather { font-size: 11px; color: var(--text-muted); min-width: 130px; }
.health-action { min-width: 100px; }

/* State Dropdown */
.state-dropdown {
  padding: 8px 12px;
  min-width: 150px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
  -webkit-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2388a0b9' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 30px;
}
.state-dropdown:focus {
  border-color: #4caf50;
}
.state-dropdown option {
  background: #1e293b;
  color: #e2e8f0;
  padding: 8px;
}

/* Syngenta Real System Run Button */
.btn-syngenta {
  background: linear-gradient(135deg, #16a34a, #059669);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
  font-family: inherit;
}
.btn-syngenta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(22, 163, 74, 0.5);
  background: linear-gradient(135deg, #15803d, #047857);
}
.btn-syngenta:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Syngenta Mode Badge */
.syngenta-mode-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.2), rgba(5, 150, 105, 0.2));
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
  margin-left: 10px;
  animation: synPulse 2s ease-in-out infinite;
}
@keyframes synPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.3); }
  50% { box-shadow: 0 0 12px 2px rgba(74, 222, 128, 0.15); }
}

/* Syngenta Enrichment Row */
.syngenta-enrichment {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 20px 10px;
  background: rgba(22, 163, 74, 0.04);
  border-top: 1px dashed rgba(74, 222, 128, 0.15);
}
.syn-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  background: rgba(22, 163, 74, 0.1);
  color: #86efac;
  border: 1px solid rgba(74, 222, 128, 0.15);
}
.syn-chip.stock {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
  border-color: rgba(96, 165, 250, 0.2);
}
.syn-chip.no-stock {
  background: rgba(234, 179, 8, 0.1);
  color: #fde047;
  border-color: rgba(250, 204, 21, 0.2);
}

/* ═══════════════════════════════════════ */
/* FARMER ENGAGEMENT INTELLIGENCE */
/* ═══════════════════════════════════════ */
.engagement-section {
  margin-bottom: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  border-left: 3px solid #10b981;
}
.eng-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.eng-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.eng-stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.eng-stat-card {
  padding: 16px;
  border-radius: 12px;
  text-align: center;
  transition: all 0.25s;
  border: 1px solid var(--border);
}
.eng-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.eng-stat-card.accent-green {
  background: rgba(16,185,129,0.08);
  border-color: rgba(16,185,129,0.2);
}
.eng-stat-card.accent-blue {
  background: rgba(59,130,246,0.08);
  border-color: rgba(59,130,246,0.2);
}
.eng-stat-card.accent-orange {
  background: rgba(245,158,11,0.08);
  border-color: rgba(245,158,11,0.2);
}
.eng-stat-card.accent-purple {
  background: rgba(139,92,246,0.08);
  border-color: rgba(139,92,246,0.2);
}
.eng-stat-card.accent-red {
  background: rgba(239,68,68,0.08);
  border-color: rgba(239,68,68,0.2);
}
.eng-icon { font-size: 22px; margin-bottom: 6px; }
.eng-num { font-size: 24px; font-weight: 800; color: var(--text-primary); }
.eng-stat-card.accent-green .eng-num { color: #10b981; }
.eng-stat-card.accent-blue .eng-num { color: #3b82f6; }
.eng-stat-card.accent-orange .eng-num { color: #f59e0b; }
.eng-stat-card.accent-purple .eng-num { color: #8b5cf6; }
.eng-stat-card.accent-red .eng-num { color: #ef4444; }
.eng-lbl { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

/* ═══════════════════════════════════════ */
/* KEY AGRICULTURAL INTELLIGENCE */
/* ═══════════════════════════════════════ */
.intel-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
  border-left: 3px solid #f59e0b;
}
.intel-header {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.intel-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.intel-card {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.25s;
}
.intel-card:hover {
  border-color: var(--accent-green);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}
.intel-icon { font-size: 28px; }
.intel-body { flex: 1; }
.intel-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.intel-val { font-size: 16px; font-weight: 800; color: var(--text-primary); margin-top: 2px; }
.intel-meta { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }

/* Mini Bar Charts */
.intel-charts {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.mini-chart {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
}
.mc-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 10px;
}
.mc-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.mc-label {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mc-bar-bg {
  flex: 1;
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  overflow: hidden;
}
.mc-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.6s ease;
}
.mc-bar-red { background: linear-gradient(90deg, #ef4444, #f87171); }
.mc-bar-orange { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.mc-bar-green { background: linear-gradient(90deg, #10b981, #34d399); }
.mc-val {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-primary);
  min-width: 24px;
  text-align: right;
}
</style>

