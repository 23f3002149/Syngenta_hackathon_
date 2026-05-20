<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>🌾 India Crop Overview</h2>
        <p class="subtitle">
          Persistent pipeline health across all scanned districts
          <span v-if="lastRun" style="margin-left: 8px; color: var(--accent-green);">
            · Last scan: {{ formatDateTime(lastRun) }}
          </span>
        </p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <select v-model="selectedState" @change="fetchData" style="min-width: 160px;">
          <option value="">All India</option>
          <option v-for="s in stateList" :key="s" :value="s">{{ s }}</option>
        </select>
        <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;" @click="expandAllStates">Expand All</button>
        <input type="text" v-model="search" placeholder="🔍 Search district..."
               style="min-width: 200px; padding: 8px 14px;" />
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card green">
        <div class="stat-label">Total Scanned</div>
        <div class="stat-value">{{ stats.total || 0 }}</div>
        <div class="stat-sub">Districts analyzed</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Healthy</div>
        <div class="stat-value">{{ stats.healthy || 0 }}</div>
        <div class="stat-sub">No disease risk</div>
      </div>
      <div class="stat-card" style="border-top: 3px solid #eab308;">
        <div class="stat-label">Advisory</div>
        <div class="stat-value">{{ stats.advisory || 0 }}</div>
        <div class="stat-sub">Precautionary alerts</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Moderate</div>
        <div class="stat-value">{{ stats.moderate || 0 }}</div>
        <div class="stat-sub">Action recommended</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">High Risk</div>
        <div class="stat-value">{{ stats.high || 0 }}</div>
        <div class="stat-sub">Immediate action</div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-row">
      <div class="filter-tabs">
        <button v-for="f in filterOptions" :key="f.key"
                :class="['filter-btn', filter === f.key ? 'active ' + f.key : '']"
                @click="filter = f.key">
          {{ f.label }} ({{ f.count }})
        </button>
      </div>
    </div>

    <!-- No Data -->
    <div v-if="!loading && districts.length === 0" class="card" style="text-align: center; padding: 50px;">
      <div style="font-size: 48px; margin-bottom: 12px;">🌱</div>
      <p style="color: var(--text-muted); font-size: 14px;">No pipeline data yet. Run the pipeline from Dashboard first.</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <span class="spinner"></span> Loading crop data...
    </div>

    <!-- State-wise Fieldsets -->
    <div v-for="sg in filteredStateGroups" :key="sg.state" class="state-fieldset">
      <div class="fieldset-header" @click="toggle(sg.state)">
        <div class="fieldset-title">
          <span class="fieldset-arrow">{{ expanded[sg.state] ? '▼' : '▶' }}</span>
          <strong>{{ sg.state }}</strong>
          <span class="fieldset-count">{{ sg.items.length }} districts</span>
        </div>
        <div class="fieldset-pills">
          <span v-if="sg.healthyCount" class="mini-pill green-pill">✅ {{ sg.healthyCount }}</span>
          <span v-if="sg.advisoryCount" class="mini-pill yellow-pill">💡 {{ sg.advisoryCount }}</span>
          <span v-if="sg.moderateCount" class="mini-pill orange-pill">⚠️ {{ sg.moderateCount }}</span>
          <span v-if="sg.highCount" class="mini-pill red-pill">🔴 {{ sg.highCount }}</span>
        </div>
      </div>
      <div v-show="expanded[sg.state]" class="fieldset-body">
        <div v-for="d in sg.items" :key="d.district_id">
          <div class="district-row" :class="'row-' + d.color" @click="toggleDetail(d.district_id)">
            <div class="col-district">
              <span :class="'dot dot-' + d.color"></span>
              <strong>{{ d.district }}</strong>
            </div>
            <div class="col-status">
              <span :class="'risk-chip chip-' + d.color">
                {{ d.status === 'healthy' ? 'Healthy' : d.risk_level }}
              </span>
            </div>
            <div class="col-details">
              <template v-if="d.status === 'healthy'">
                <span class="detail-safe">No disease risk detected</span>
              </template>
              <template v-else>
                <span class="detail-crop">{{ d.crop }}</span>
                <span class="detail-arrow">→</span>
                <strong class="detail-disease">{{ d.disease }}</strong>
                <span class="detail-prob">({{ (d.probability * 100).toFixed(0) }}%)</span>
                <span v-if="d.product" class="detail-rx">Rx: {{ d.product }}</span>
              </template>
            </div>
            <div class="col-campaign" v-if="d.campaign_id">
              <span :class="'campaign-chip chip-' + (d.campaign_status || 'pending')"
                    @click.stop="$router.push('/campaigns')">
                {{ d.campaign_status || 'pending' }}
              </span>
            </div>
            <div class="col-expand">
              <span class="expand-icon">{{ expandedDetail[d.district_id] ? '▲' : 'ℹ️' }}</span>
            </div>
          </div>
          <!-- Weather Detail Panel -->
          <div v-show="expandedDetail[d.district_id]" class="weather-panel" :class="'panel-' + d.color">
            <!-- Summary Cards -->
            <div class="weather-grid">
              <div class="weather-item">
                <span class="weather-icon">🌡️</span>
                <div>
                  <div class="weather-label">Avg Temperature</div>
                  <div class="weather-value">{{ d.weather?.avg_temp?.toFixed(1) || '—' }}°C</div>
                  <div class="weather-sub" v-if="d.weather?.max_temp">
                    Max: {{ d.weather.max_temp.toFixed(1) }}° · Min: {{ d.weather.min_temp?.toFixed(1) }}°
                  </div>
                </div>
              </div>
              <div class="weather-item">
                <span class="weather-icon">💧</span>
                <div>
                  <div class="weather-label">Avg Humidity</div>
                  <div class="weather-value">{{ d.weather?.avg_humidity?.toFixed(0) || '—' }}%</div>
                  <div class="weather-sub">7-day average</div>
                </div>
              </div>
              <div class="weather-item">
                <span class="weather-icon">🌧️</span>
                <div>
                  <div class="weather-label">Total Rainfall</div>
                  <div class="weather-value">{{ d.weather?.total_rainfall?.toFixed(1) || '0' }} mm</div>
                  <div class="weather-sub" v-if="d.weather?.rainy_days != null">
                    {{ d.weather.rainy_days }} rainy days
                  </div>
                </div>
              </div>
              <div class="weather-item">
                <span class="weather-icon">💨</span>
                <div>
                  <div class="weather-label">Avg Wind</div>
                  <div class="weather-value">{{ d.weather?.avg_wind_speed?.toFixed(1) || '—' }} km/h</div>
                  <div class="weather-sub">Max gusts</div>
                </div>
              </div>
            </div>

            <!-- 7-Day Daily Forecast Strip -->
            <div v-if="d.weather?.forecast && d.weather.forecast.length" class="forecast-strip">
              <div class="forecast-label">📅 7-Day Forecast</div>
              <div class="forecast-days">
                <div v-for="(day, i) in d.weather.forecast" :key="i" class="forecast-day">
                  <div class="day-name">{{ formatDayName(day.date) }}</div>
                  <div class="day-icon">{{ getDayIcon(day) }}</div>
                  <div class="day-temp">
                    <span class="temp-high">{{ day.temp_max?.toFixed(0) }}°</span>
                    <span class="temp-low">{{ day.temp_min?.toFixed(0) }}°</span>
                  </div>
                  <div class="day-rain" v-if="day.rainfall > 0">
                    🌧 {{ day.rainfall?.toFixed(1) }}mm
                  </div>
                  <div class="day-rain dry" v-else>☀️ Dry</div>
                  <div class="day-humidity">💧{{ day.humidity?.toFixed(0) }}%</div>
                </div>
              </div>
            </div>

            <div class="weather-footer">
              <span>📍 {{ d.lat?.toFixed(2) }}°N, {{ d.lon?.toFixed(2) }}°E</span>
              <span>📅 Scanned: {{ formatDateTime(d.scanned_at) }}</span>
              <span v-if="d.method">🔬 Method: {{ d.method === 'ml' ? 'ML Model' : d.method === 'rules' ? 'Rule Engine' : d.method }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && filteredStateGroups.length === 0 && districts.length > 0"
         class="card" style="text-align: center; padding: 30px; color: var(--text-muted);">
      No districts match your filter.
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import { API } from '../config/api'

export default {
  name: 'CropOverview',
  data() {
    return {
      districts: [],
      stats: {},
      lastRun: null,
      stateList: [],
      selectedState: '',
      search: '',
      filter: 'all',
      expanded: {},
      expandedDetail: {},
      loading: false,
    }
  },
  computed: {
    filteredDistricts() {
      let items = this.districts
      if (this.filter === 'healthy') items = items.filter(d => d.status === 'healthy')
      else if (this.filter === 'advisory') items = items.filter(d => d.risk_level === 'ADVISORY')
      else if (this.filter === 'moderate') items = items.filter(d => d.risk_level === 'MODERATE')
      else if (this.filter === 'high') items = items.filter(d => d.risk_level === 'HIGH')
      if (this.search) {
        const q = this.search.toLowerCase()
        items = items.filter(d => d.district?.toLowerCase().includes(q) || d.state?.toLowerCase().includes(q))
      }
      return items
    },
    filterOptions() {
      return [
        { key: 'all', label: 'All', count: this.districts.length },
        { key: 'healthy', label: '✅ Healthy', count: this.stats.healthy || 0 },
        { key: 'advisory', label: '💡 Advisory', count: this.stats.advisory || 0 },
        { key: 'moderate', label: '⚠️ Moderate', count: this.stats.moderate || 0 },
        { key: 'high', label: '🔴 High', count: this.stats.high || 0 },
      ]
    },
    filteredStateGroups() {
      const map = {}
      for (const d of this.filteredDistricts) {
        const st = d.state || 'Unknown'
        if (!map[st]) map[st] = []
        map[st].push(d)
      }
      return Object.keys(map).sort().map(state => ({
        state,
        items: map[state],
        healthyCount: map[state].filter(d => d.status === 'healthy').length,
        advisoryCount: map[state].filter(d => d.risk_level === 'ADVISORY').length,
        moderateCount: map[state].filter(d => d.risk_level === 'MODERATE').length,
        highCount: map[state].filter(d => d.risk_level === 'HIGH').length,
      }))
    },
  },
  mounted() {
    this.fetchStates()
    this.fetchData()
  },
  methods: {
    toggle(state) {
      this.expanded = { ...this.expanded, [state]: !this.expanded[state] }
    },
    expandAllStates() {
      const expanded = {}
      for (const d of this.districts) {
        if (d.state) expanded[d.state] = true
      }
      this.expanded = expanded
    },
    toggleDetail(districtId) {
      this.expandedDetail = { ...this.expandedDetail, [districtId]: !this.expandedDetail[districtId] }
    },
    async fetchStates() {
      try {
        const { data } = await axios.get(`${API}/states`)
        this.stateList = (data.states || []).map(s => s.state).sort()
      } catch (e) { console.error(e) }
    },
    async fetchData() {
      this.loading = true
      try {
        let url = `${API}/overview/health`
        if (this.selectedState) url += `?state=${this.selectedState}`
        const { data } = await axios.get(url)
        this.districts = data.districts || []
        this.stats = data.stats || {}
        this.lastRun = data.last_run
        const expanded = {}
        for (const d of this.districts) {
          if (d.state) expanded[d.state] = true
        }
        this.expanded = expanded
      } catch (e) { console.error(e) }
      this.loading = false
    },
    formatDateTime(dt) {
      if (!dt) return ''
      return new Date(dt).toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    },
    formatDayName(dateStr) {
      if (!dateStr) return ''
      const d = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (d.toDateString() === today.toDateString()) return 'Today'
      if (d.toDateString() === tomorrow.toDateString()) return 'Tmrw'
      return d.toLocaleDateString('en-IN', { weekday: 'short' })
    },
    getDayIcon(day) {
      if (!day) return '☀️'
      if (day.rainfall > 20) return '⛈️'
      if (day.rainfall > 5) return '🌧️'
      if (day.rainfall > 0) return '🌦️'
      if (day.humidity > 75) return '🌥️'
      if ((day.temp_max || 0) > 40) return '🔥'
      return '☀️'
    },
  }
}
</script>

<style scoped>
.filter-row { margin-bottom: 16px; }
.filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 500;
  background: var(--bg-secondary); border: 1px solid var(--border);
  color: var(--text-muted); cursor: pointer; transition: all 0.2s; font-family: inherit;
}
.filter-btn:hover { border-color: var(--accent-green); color: var(--text-primary); }
.filter-btn.active.all { background: var(--accent-blue-glow); border-color: var(--accent-blue); color: var(--accent-blue); }
.filter-btn.active.healthy { background: rgba(76,175,80,0.15); border-color: #4caf50; color: #4caf50; }
.filter-btn.active.advisory { background: rgba(234,179,8,0.15); border-color: #eab308; color: #eab308; }
.filter-btn.active.moderate { background: rgba(255,152,0,0.15); border-color: #ff9800; color: #ff9800; }
.filter-btn.active.high { background: rgba(244,67,54,0.15); border-color: #f44336; color: #f44336; }

.state-fieldset {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); margin-bottom: 12px; overflow: hidden;
}
.fieldset-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; cursor: pointer; transition: background 0.2s;
}
.fieldset-header:hover { background: var(--bg-card-hover); }
.fieldset-title { display: flex; align-items: center; gap: 10px; color: var(--text-primary); }
.fieldset-arrow { font-size: 11px; color: var(--text-muted); width: 14px; }
.fieldset-count { font-size: 12px; color: var(--text-muted); }
.fieldset-pills { display: flex; gap: 6px; }
.mini-pill { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.green-pill { background: rgba(76,175,80,0.12); color: #4caf50; }
.yellow-pill { background: rgba(234,179,8,0.12); color: #eab308; }
.orange-pill { background: rgba(255,152,0,0.12); color: #ff9800; }
.red-pill { background: rgba(244,67,54,0.12); color: #f44336; }
.fieldset-body { border-top: 1px solid var(--border); }

.district-row {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 13px; transition: background 0.15s;
}
.district-row:hover { background: var(--bg-card-hover); }
.district-row:last-child { border-bottom: none; }
.row-green { border-left: 3px solid #4caf50; }
.row-yellow { border-left: 3px solid #eab308; }
.row-orange { border-left: 3px solid #ff9800; }
.row-red { border-left: 3px solid #f44336; }

.col-district { min-width: 160px; display: flex; align-items: center; gap: 8px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-green { background: #4caf50; }
.dot-yellow { background: #eab308; }
.dot-orange { background: #ff9800; }
.dot-red { background: #f44336; }

.col-status { min-width: 80px; }
.risk-chip {
  padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.chip-green { background: rgba(76,175,80,0.12); color: #4caf50; }
.chip-yellow { background: rgba(234,179,8,0.12); color: #eab308; }
.chip-orange { background: rgba(255,152,0,0.12); color: #ff9800; }
.chip-red { background: rgba(244,67,54,0.12); color: #f44336; }

.col-details { flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.detail-safe { color: var(--accent-green); font-size: 12px; }
.detail-crop { color: var(--text-secondary); font-size: 12px; }
.detail-arrow { color: var(--text-muted); font-size: 11px; }
.detail-disease { color: var(--accent-red); font-size: 12px; }
.detail-prob { color: var(--text-muted); font-size: 11px; }
.detail-rx { color: var(--accent-green); font-size: 11px; margin-left: 6px; }

.col-campaign { min-width: 80px; }
.campaign-chip {
  padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;
  cursor: pointer; text-transform: capitalize;
}
.chip-pending { background: var(--accent-blue-glow); color: var(--accent-blue); }
.chip-approved { background: rgba(76,175,80,0.12); color: #4caf50; }
.chip-completed { background: rgba(139,92,246,0.12); color: #8b5cf6; }

/* Expand icon */
.col-expand { min-width: 30px; text-align: center; }
.expand-icon {
  font-size: 13px; cursor: pointer; opacity: 0.6;
  transition: opacity 0.2s;
}
.district-row:hover .expand-icon { opacity: 1; }
.district-row { cursor: pointer; }

/* Weather Detail Panel */
.weather-panel {
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  animation: slideDown 0.2s ease-out;
}
@keyframes slideDown {
  from { opacity: 0; max-height: 0; padding: 0 24px; }
  to { opacity: 1; max-height: 200px; padding: 16px 24px; }
}
.panel-green { border-left: 3px solid #4caf50; }
.panel-yellow { border-left: 3px solid #eab308; }
.panel-orange { border-left: 3px solid #ff9800; }
.panel-red { border-left: 3px solid #f44336; }

.weather-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 768px) {
  .weather-grid { grid-template-columns: repeat(2, 1fr); }
}
.weather-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 14px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.weather-icon { font-size: 20px; margin-top: 2px; }
.weather-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.weather-value { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 2px 0; }
.weather-sub { font-size: 11px; color: var(--text-muted); }

.weather-footer {
  display: flex; gap: 20px; flex-wrap: wrap;
  margin-top: 12px; padding-top: 10px;
  border-top: 1px solid var(--border);
  font-size: 11px; color: var(--text-muted);
}

/* 7-Day Forecast Strip */
.forecast-strip {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.forecast-label {
  font-size: 12px; font-weight: 600; color: var(--text-secondary);
  margin-bottom: 10px;
}
.forecast-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
@media (max-width: 768px) {
  .forecast-days { grid-template-columns: repeat(4, 1fr); }
}
.forecast-day {
  display: flex; flex-direction: column; align-items: center;
  padding: 10px 6px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  text-align: center;
  transition: transform 0.15s, border-color 0.15s;
}
.forecast-day:hover {
  transform: translateY(-2px);
  border-color: var(--accent-green);
}
.day-name {
  font-size: 11px; font-weight: 700; color: var(--text-secondary);
  text-transform: uppercase; letter-spacing: 0.5px;
  margin-bottom: 4px;
}
.day-icon { font-size: 22px; margin: 4px 0; }
.day-temp {
  display: flex; gap: 4px; font-size: 13px; font-weight: 600;
  margin: 4px 0;
}
.temp-high { color: #ef4444; }
.temp-low { color: #60a5fa; }
.day-rain {
  font-size: 10px; color: #3b82f6; margin-top: 2px;
}
.day-rain.dry { color: var(--text-muted); }
.day-humidity {
  font-size: 10px; color: var(--text-muted); margin-top: 2px;
}
</style>
