<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>Crop Health Monitor</h2>
        <p class="subtitle">Real-time vegetation health analysis using weather-derived VHI</p>
      </div>
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <select v-model="scanState">
          <option value="">All India</option>
          <option v-for="s in stateList" :key="s" :value="s">{{ s }}</option>
        </select>
        <input type="number" v-model.number="scanPoints" min="5" max="200" 
               style="width: 70px;" placeholder="Limit" title="Max districts" />
        <button class="btn btn-primary" @click="runScan" :disabled="scanning">
          {{ scanning ? 'Scanning...' : '🛰️ Run Scan' }}
        </button>
      </div>
    </div>

    <!-- Scan Stats -->
    <div class="stats-grid" v-if="totalStats.total > 0">
      <div class="stat-card green">
        <div class="stat-label">Healthy</div>
        <div class="stat-value">{{ totalStats.healthy }}</div>
        <div class="stat-sub">VHI > 0.6</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">Moderate</div>
        <div class="stat-value">{{ totalStats.moderate }}</div>
        <div class="stat-sub">VHI 0.4 - 0.6</div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">Stressed</div>
        <div class="stat-value">{{ totalStats.stressed }}</div>
        <div class="stat-sub">VHI < 0.4 — needs attention</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">Total Scanned</div>
        <div class="stat-value">{{ totalStats.total }}</div>
        <div class="stat-sub">districts analyzed</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">States Covered</div>
        <div class="stat-value">{{ Object.keys(groupedPoints).length }}</div>
        <div class="stat-sub">with monitored crops</div>
      </div>
    </div>

    <!-- Scan info banner -->
    <div v-if="scanResult" class="card" style="padding: 12px 16px; margin-bottom: 16px; font-size: 12px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; align-items: center;">
      <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
        <span :style="{color: scanResult.nasa_available ? '#10b981' : 'var(--text-muted)'}">
          {{ scanResult.nasa_available ? '🛰️ NASA MODIS: Connected' : '🛰️ NASA MODIS: Offline' }}
        </span>
        <span style="color: var(--text-secondary);">
          🔬 Source: <strong>{{ scanResult.method || '3-tier fallback' }}</strong>
        </span>
      </div>
      <div style="display: flex; gap: 12px; color: var(--text-muted);">
        <span v-if="scanResult.cached_skipped">📦 {{ scanResult.cached_skipped }} cached (7-day dedup)</span>
        <span v-if="scanResult.total_points">✨ {{ scanResult.total_points }} new scans</span>
      </div>
    </div>
    <!-- Case breakdown -->
    <div v-if="scanResult && scanResult.case_breakdown" class="card" style="padding: 10px 16px; margin-bottom: 16px; font-size: 12px; display: flex; gap: 16px; flex-wrap: wrap; color: var(--text-muted);">
      <span>📊 Case 1 (Crop Monitored): <strong style="color: #10b981;">{{ scanResult.case_breakdown.case_1_crop_monitored }}</strong></span>
      <span>🔍 Case 2 (No Season Crop): <strong style="color: #f59e0b;">{{ scanResult.case_breakdown.case_2_no_season_crop }}</strong></span>
      <span>📍 Case 3 (Unmonitored): <strong style="color: #ef4444;">{{ scanResult.case_breakdown.case_3_unmonitored }}</strong></span>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">🛰️ Crop Health Heatmap</span>
        <span style="font-size: 12px; color: var(--text-muted); display: flex; gap: 14px; align-items: center;">
          <span class="legend-item"><span class="legend-dot" style="background:#10b981;"></span> Healthy</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f59e0b;"></span> Moderate</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ef4444;"></span> Stressed</span>
          <span class="legend-item"><span class="legend-dot" style="background:#dc2626;"></span> Severe</span>
        </span>
      </div>
      <div id="ndvi-map" class="map-container" ref="mapContainer"></div>
    </div>

    <!-- Results Section with Filter -->
    <div v-if="allPoints.length > 0">
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 24px 0 16px; flex-wrap: wrap; gap: 10px;">
        <h3 style="margin: 0; color: var(--text-primary);">Scan Results by State</h3>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <select v-model="resultStateFilter" style="min-width: 140px;">
            <option value="">All States</option>
            <option v-for="s in resultStates" :key="s" :value="s">{{ s }}</option>
          </select>
          <input type="text" v-model="resultSearch" placeholder="Search district..." 
                 style="width: 160px; padding: 6px 12px; font-size: 12px;" />
          <button :class="['tab-btn', alertFilter === 'all' ? 'active' : '']" @click="alertFilter = 'all'">All</button>
          <button :class="['tab-btn', alertFilter === 'stress' ? 'active' : '']" @click="alertFilter = 'stress'">Stressed</button>
          <button :class="['tab-btn', alertFilter === 'healthy' ? 'active' : '']" @click="alertFilter = 'healthy'">Healthy</button>
        </div>
      </div>

      <div v-for="(points, state) in filteredGrouped" :key="state" class="state-section">
        <div class="state-header">
          <div class="state-info">
            <span class="state-dot" :style="{background: getStateColor(points)}"></span>
            <h3 class="state-name">{{ state }}</h3>
            <span class="state-meta">{{ points.length }} points</span>
            <span class="state-stress" v-if="getStressCount(points) > 0">
              · {{ getStressCount(points) }} stressed
            </span>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button v-if="getUnassignedStressCount(state, points) > 0"
                    class="btn btn-outline btn-sm" 
                    @click="assignStateReps(state, points)"
                    style="font-size:11px; white-space:nowrap;">
              🧑‍🌾 Assign All {{ getUnassignedStressCount(state, points) }} Field Reps
            </button>
            <span v-if="getAssignedCount(state, points) > 0" style="font-size:11px; color:#10b981;">
              ✅ {{ getAssignedCount(state, points) }} assigned
            </span>
            <div class="state-avg">
              Avg VHI: <strong :style="{color: ndviColor(avgNDVI(points))}">{{ avgNDVI(points).toFixed(2) }}</strong>
            </div>
          </div>
        </div>

        <div class="ndvi-grid">
          <div v-for="(p, i) in points" :key="i" class="ndvi-card" :class="'ndvi-' + p.stress_level">
            <div class="ndvi-card-top">
              <div>
                <div class="ndvi-district">{{ p.district?.district || p.district_name || 'Unknown' }}</div>
                <div class="ndvi-date">{{ formatDate(p.scanned_at || p.created_at) }}</div>
              </div>
              <div class="ndvi-value" :style="{color: ndviColor(p.ndvi_value)}">
                {{ p.ndvi_value?.toFixed(2) }}
              </div>
            </div>
            <div class="ndvi-bar-wrap">
              <div class="ndvi-bar" :style="{width: (p.ndvi_value * 100) + '%', background: ndviColor(p.ndvi_value)}"></div>
            </div>
            <div class="ndvi-details">
              <div class="ndvi-detail">
                <span class="ndvi-label">Status</span>
                <span :class="'stress-badge stress-' + p.stress_level">{{ p.stress_level }}</span>
              </div>
              <div class="ndvi-detail" v-if="p.alert_type">
                <span class="ndvi-label">Alert Type</span>
                <span class="ndvi-val" :style="{color: p.alert_type === 'crop_disease_risk' ? '#ef4444' : p.alert_type === 'vegetation_stress' ? '#f59e0b' : '#10b981'}">
                  {{ p.alert_type === 'crop_disease_risk' ? '⚠️ Crop Risk' : p.alert_type === 'vegetation_stress' ? '🔍 Verify' : p.alert_type === 'unmonitored_area' ? '📍 Unmonitored' : '✅ Healthy' }}
                </span>
              </div>
              <div class="ndvi-detail" v-if="p.distance_km">
                <span class="ndvi-label">Match Dist</span>
                <span class="ndvi-val">{{ p.distance_km }} km</span>
              </div>
              <div class="ndvi-detail" v-if="p.weather">
                <span class="ndvi-label">Temp</span>
                <span class="ndvi-val">{{ p.weather.temp?.toFixed(1) }}°C</span>
              </div>
              <div class="ndvi-detail" v-if="p.weather">
                <span class="ndvi-label">Humidity</span>
                <span class="ndvi-val">{{ p.weather.humidity?.toFixed(0) }}%</span>
              </div>
              <div class="ndvi-detail" v-if="p.weather">
                <span class="ndvi-label">Rain</span>
                <span class="ndvi-val">{{ p.weather.rainfall?.toFixed(1) }}mm</span>
              </div>
              <div class="ndvi-detail" v-if="p.crops && p.crops.length > 0">
                <span class="ndvi-label">Crops</span>
                <span class="ndvi-val crops">{{ p.crops.join(', ') }}</span>
              </div>
              <div class="ndvi-detail" v-if="p.vhi">
                <span class="ndvi-label">VHI Score</span>
                <span class="ndvi-val">{{ p.vhi }}</span>
              </div>
              <div class="ndvi-detail" v-if="p.method">
                <span class="ndvi-label">Source</span>
                <span class="ndvi-val" :style="{color: p.method === 'nasa_modis' ? '#10b981' : p.method === 'weather_vhi' ? '#60a5fa' : '#f59e0b'}">
                  {{ p.method === 'nasa_modis' ? '🛰️ NASA' : p.method === 'weather_vhi' ? '🌤️ VHI' : '⚠️ Demo' }}
                </span>
              </div>
            </div>
            <!-- Assign Field Rep Button -->
            <div v-if="p.stress_level !== 'healthy'" class="field-rep-section">
              <button v-if="!assignedReps[getPointKey(p)]" 
                      class="btn-assign" @click="assignRep(p)">
                🧑‍🌾 Assign Field Rep — Offline Verification Needed
              </button>
              <div v-else class="assigned-badge">
                <span class="assigned-pulse"></span>
                ✅ Field Rep Assigned — {{ assignedReps[getPointKey(p)] }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="card" style="text-align: center; padding: 40px;">
      <p style="color: var(--text-muted); font-size: 16px;">Run a scan to analyze crop health using real weather data</p>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import L from 'leaflet'
import { API } from '../config/api'

export default {
  name: 'NDVIMap',
  data() {
    return {
      map: null,
      markers: [],
      scanState: '',
      scanPoints: 50,
      scanResult: null,
      allPoints: [],
      scanning: false,
      stateList: [],
      alertFilter: 'all',
      resultStateFilter: '',
      resultSearch: '',
      assignedReps: {},
    }
  },
  computed: {
    totalStats() {
      const pts = this.allPoints
      return {
        total: pts.length,
        healthy: pts.filter(p => p.stress_level === 'healthy').length,
        moderate: pts.filter(p => p.stress_level === 'moderate').length,
        stressed: pts.filter(p => ['stressed', 'severe'].includes(p.stress_level)).length,
      }
    },
    resultStates() {
      return [...new Set(this.allPoints.map(p => p.district?.state || p.state || 'Unknown'))].sort()
    },
    groupedPoints() {
      const groups = {}
      this.allPoints.forEach(p => {
        const state = p.district?.state || p.state || 'Unknown'
        if (!groups[state]) groups[state] = []
        groups[state].push(p)
      })
      const sorted = {}
      Object.keys(groups).sort().forEach(k => { sorted[k] = groups[k] })
      return sorted
    },
    filteredGrouped() {
      const result = {}
      Object.entries(this.groupedPoints).forEach(([state, points]) => {
        // State filter
        if (this.resultStateFilter && state !== this.resultStateFilter) return
        
        let filtered = points
        // Stress filter
        if (this.alertFilter === 'stress') {
          filtered = filtered.filter(p => p.stress_level !== 'healthy')
        } else if (this.alertFilter === 'healthy') {
          filtered = filtered.filter(p => p.stress_level === 'healthy')
        }
        // Search filter
        if (this.resultSearch) {
          const q = this.resultSearch.toLowerCase()
          filtered = filtered.filter(p => 
            (p.district?.district || p.district_name || '').toLowerCase().includes(q) ||
            (p.crops || []).join(' ').toLowerCase().includes(q)
          )
        }
        if (filtered.length > 0) result[state] = filtered
      })
      return result
    }
  },
  mounted() {
    this.$nextTick(() => { this.initMap() })
    this.fetchStates()
    this.loadFromDB()
  },
  methods: {
    initMap() {
      this.map = L.map(this.$refs.mapContainer).setView([20.5937, 78.9629], 5)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: 'CartoDB',
        maxZoom: 18,
      }).addTo(this.map)
    },
    async fetchStates() {
      try {
        const { data } = await axios.get(`${API}/states`)
        this.stateList = (data.states || []).map(s => s.state).sort()
      } catch (e) { console.error(e) }
    },
    async loadFromDB() {
      // Load previously saved NDVI data so page is never blank
      try {
        const { data } = await axios.get(`${API}/ndvi/heatmap`)
        if (data.points && data.points.length > 0) {
          // Convert DB format to display format
          this.allPoints = data.points.map(p => ({
            coordinates: { lat: p.latitude, lon: p.longitude },
            ndvi_value: p.ndvi_value,
            stress_level: p.stress_level,
            alert_type: p.alert_type || null,
            district: { state: p.state, district: p.district_name },
            state: p.state,
            district_name: p.district_name,
            created_at: p.created_at,
            distance_km: p.matched_distance_km || 0,
            has_crops: p.has_active_crop === 1,
            crops: [],
            method: p.method || null,
            weather: p.weather || null,
          }))
          this.plotPoints(this.allPoints)
        }
      } catch (e) { console.error('Load NDVI error:', e) }
    },
    async runScan() {
      this.scanning = true
      try {
        const { data } = await axios.post(`${API}/ndvi/scan`, {
          state: this.scanState || null,
          points: this.scanPoints
        })
        this.scanResult = data
        
        // MERGE new points with existing (don't replace!)
        const newPoints = data.points || []
        if (newPoints.length > 0) {
          // Remove old entries for districts that were re-scanned
          const newDistrictIds = new Set(newPoints.map(p => p.district?.id).filter(Boolean))
          this.allPoints = this.allPoints.filter(p => {
            const existingId = p.district?.id
            return !existingId || !newDistrictIds.has(existingId)
          })
          // Add new
          this.allPoints = [...this.allPoints, ...newPoints]
        }
        
        this.plotPoints(this.allPoints)
      } catch (e) { console.error(e) }
      this.scanning = false
    },
    plotPoints(points) {
      this.markers.forEach(m => this.map.removeLayer(m))
      this.markers = []

      points.forEach(p => {
        const lat = p.coordinates?.lat || p.latitude
        const lon = p.coordinates?.lon || p.longitude
        if (!lat || !lon) return
        
        const color = this.ndviColor(p.ndvi_value)
        
        const marker = L.circleMarker([lat, lon], {
          radius: 9,
          fillColor: color,
          color: color,
          weight: 2,
          fillOpacity: 0.75,
        }).addTo(this.map)

        const distName = p.district?.district || p.district_name || 'Unknown'
        const stateName = p.district?.state || p.state || 'Unknown'
        
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 13px; min-width: 180px;">
            <strong style="font-size: 15px;">VHI: ${p.ndvi_value?.toFixed(2)}</strong>
            <span style="color: ${color}; margin-left: 6px;">(${p.stress_level})</span><br>
            <hr style="border: none; border-top: 1px solid #333; margin: 6px 0;">
            <b>District:</b> ${distName}<br>
            <b>State:</b> ${stateName}<br>
            ${p.weather ? `<b>Temp:</b> ${p.weather.temp?.toFixed(1)}°C · <b>Humidity:</b> ${p.weather.humidity?.toFixed(0)}%<br>` : ''}
            ${p.crops && p.crops.length ? `<b>Crops:</b> ${p.crops.join(', ')}` : ''}
          </div>
        `)
        this.markers.push(marker)
      })

      if (this.markers.length > 0) {
        const group = L.featureGroup(this.markers)
        this.map.fitBounds(group.getBounds().pad(0.1))
      }
    },
    formatDate(dt) {
      if (!dt) return ''
      const d = new Date(dt)
      const now = new Date()
      const diffMs = now - d
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    },
    ndviColor(val) {
      if (val >= 0.6) return '#10b981'   // Healthy → Green
      if (val >= 0.4) return '#f59e0b'   // Moderate → Orange
      if (val >= 0.2) return '#ef4444'   // Stressed → Red
      return '#dc2626'                   // Severe → Dark Red
    },
    getStateColor(points) {
      const stressed = points.filter(p => p.stress_level === 'stressed' || p.stress_level === 'severe').length
      if (stressed > 0) return '#ef4444'
      const moderate = points.filter(p => p.stress_level === 'moderate').length
      if (moderate > 0) return '#f59e0b'
      return '#10b981'
    },
    getStressCount(points) {
      return points.filter(p => p.stress_level !== 'healthy').length
    },
    avgNDVI(points) {
      if (!points.length) return 0
      return points.reduce((s, p) => s + (p.ndvi_value || 0), 0) / points.length
    },
    getPointKey(p) {
      const dist = p.district?.district || p.district_name || 'Unknown'
      const state = p.district?.state || p.state || 'Unknown'
      return `${state}_${dist}`
    },
    assignRep(p) {
      const key = this.getPointKey(p)
      const dist = p.district?.district || p.district_name || 'Unknown'
      const severity = p.stress_level
      const priority = severity === 'severe' ? 'URGENT' : severity === 'stressed' ? 'HIGH' : 'MEDIUM'
      const timestamp = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})
      this.assignedReps = { ...this.assignedReps, [key]: `${priority} Priority · ${timestamp}` }
    },
    assignStateReps(state, points) {
      const stressed = points.filter(p => p.stress_level !== 'healthy' && !this.assignedReps[this.getPointKey(p)])
      const timestamp = new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'})
      const updated = { ...this.assignedReps }
      stressed.forEach(p => {
        const key = this.getPointKey(p)
        const severity = p.stress_level
        const priority = severity === 'severe' ? 'URGENT' : severity === 'stressed' ? 'HIGH' : 'MEDIUM'
        updated[key] = `${priority} Priority · ${timestamp}`
      })
      this.assignedReps = updated
    },
    getUnassignedStressCount(state, points) {
      return points.filter(p => p.stress_level !== 'healthy' && !this.assignedReps[this.getPointKey(p)]).length
    },
    getAssignedCount(state, points) {
      return points.filter(p => this.assignedReps[this.getPointKey(p)]).length
    },
  }
}
</script>

<style scoped>
@import 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

/* Tab buttons */
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

/* State Section */
.state-section { margin-bottom: 28px; }
.state-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 14px;
}
.state-info { display: flex; align-items: center; gap: 10px; }
.state-dot { width: 10px; height: 10px; border-radius: 50%; }
.state-name { font-size: 17px; font-weight: 700; color: var(--text-primary); margin: 0; }
.state-meta { font-size: 13px; color: var(--text-muted); }
.state-stress { font-size: 13px; color: #ef4444; }
.state-avg { font-size: 13px; color: var(--text-muted); }

/* NDVI Card Grid */
.ndvi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.ndvi-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px;
  transition: all 0.25s;
}
.ndvi-card:hover {
  border-color: var(--accent-green);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(16,185,129,0.08);
}
.ndvi-stressed { border-left: 3px solid #ef4444; }
.ndvi-severe { border-left: 3px solid #dc2626; }
.ndvi-moderate { border-left: 3px solid #f59e0b; }
.ndvi-healthy { border-left: 3px solid #10b981; }

.ndvi-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.ndvi-district { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.ndvi-date { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.ndvi-value { font-size: 20px; font-weight: 800; font-family: 'Inter', monospace; }

.ndvi-bar-wrap {
  width: 100%;
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 4px;
  margin-bottom: 12px;
  overflow: hidden;
}
.ndvi-bar { height: 100%; border-radius: 4px; transition: width 0.5s; }

.ndvi-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.ndvi-detail { display: flex; flex-direction: column; gap: 1px; }
.ndvi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.ndvi-val { font-size: 12px; color: var(--text-secondary); }
.ndvi-val.crops { color: var(--accent-green); }

.stress-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: inline-block;
  width: fit-content;
}
.stress-healthy { background: rgba(16,185,129,0.15); color: #10b981; }
.stress-moderate { background: rgba(245,158,11,0.15); color: #f59e0b; }
.stress-stressed { background: rgba(239,68,68,0.15); color: #ef4444; }
.stress-severe { background: rgba(220,38,38,0.15); color: #dc2626; }

/* Field Rep Assignment */
.field-rep-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  grid-column: 1 / -1;
}
.btn-assign {
  width: 100%;
  padding: 8px 12px;
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  background: rgba(245,158,11,0.08);
  color: #f59e0b;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
}
.btn-assign:hover {
  background: rgba(245,158,11,0.18);
  border-style: solid;
  transform: translateY(-1px);
}
.assigned-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.2);
  color: #10b981;
  font-size: 11px;
  font-weight: 500;
}
.assigned-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: repPulse 1.5s ease-in-out infinite;
}
@keyframes repPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}
</style>
