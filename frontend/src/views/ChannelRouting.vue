<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>📡 Channel Routing Intelligence</h2>
        <p class="subtitle">Device-based delivery optimization · {{ totals.total || 0 }} farmers mapped</p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
        <select v-model="selectedState" style="min-width: 160px;">
          <option value="">All States</option>
          <option v-for="s in stateList" :key="s" :value="s">{{ s }}</option>
        </select>
        <input type="text" v-model="search" placeholder="🔍 Search district..."
               style="min-width: 200px; padding: 8px 14px;" />
        <button class="btn btn-primary" @click="fetchData" :disabled="loading">
          {{ loading ? 'Loading...' : '🔄 Refresh' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card" style="text-align: center; padding: 60px;">
      <span class="spinner"></span>
      <p style="color: var(--text-muted); margin-top: 12px;">Loading channel data...</p>
    </div>

    <!-- No Data -->
    <div v-else-if="!totals.total" class="card" style="text-align: center; padding: 50px;">
      <div style="font-size: 48px; margin-bottom: 12px;">📡</div>
      <p style="color: var(--text-muted); font-size: 14px;">No grower data available. Import Syngenta data first.</p>
    </div>

    <!-- Main Content (only when data loaded) -->
    <template v-else>
      <!-- Channel Plan Cards -->
      <div class="channel-plan">
        <div class="ch-plan-item ch-whatsapp">
          <div class="ch-plan-icon">💬</div>
          <div class="ch-plan-info">
            <div class="ch-plan-label">WhatsApp + Poster</div>
            <div class="ch-plan-value">{{ filteredTotals.smartphone }}</div>
            <div class="ch-plan-sub">Smartphone farmers</div>
          </div>
          <div class="ch-plan-pct">{{ filteredTotals.smartphonePct }}%</div>
        </div>
        <div class="ch-plan-item ch-voice">
          <div class="ch-plan-icon">🔊</div>
          <div class="ch-plan-info">
            <div class="ch-plan-label">SMS + Voice Call</div>
            <div class="ch-plan-value">{{ filteredTotals.keypad + filteredTotals.unknown }}</div>
            <div class="ch-plan-sub">Keypad + Unknown devices</div>
          </div>
          <div class="ch-plan-pct">{{ (parseFloat(filteredTotals.keypadPct) + parseFloat(filteredTotals.unknownPct)).toFixed(1) }}%</div>
        </div>
        <div class="ch-plan-item ch-poster">
          <div class="ch-plan-icon">🖼️</div>
          <div class="ch-plan-info">
            <div class="ch-plan-label">Poster Delivery</div>
            <div class="ch-plan-value">{{ filteredTotals.smartphone }}</div>
            <div class="ch-plan-sub">WhatsApp image capable</div>
          </div>
          <div class="ch-plan-pct">{{ filteredTotals.smartphonePct }}%</div>
        </div>
        <div class="ch-plan-item ch-total">
          <div class="ch-plan-icon">🎯</div>
          <div class="ch-plan-info">
            <div class="ch-plan-label">Total Reach</div>
            <div class="ch-plan-value">{{ filteredTotals.total }}</div>
            <div class="ch-plan-sub">All farmers covered</div>
          </div>
          <div class="ch-plan-pct">100%</div>
        </div>
      </div>

      <!-- Device Distribution -->
      <div class="card" style="margin-top: 16px;">
        <div class="card-header">
          <span class="card-title">📊 Device Distribution</span>
        </div>
        <div style="padding: 16px 20px;">
          <div class="device-bar-overall">
            <div class="dbar-seg dbar-smart" :style="{width: filteredTotals.smartphonePct + '%'}">
              📱 {{ filteredTotals.smartphonePct }}%
            </div>
            <div class="dbar-seg dbar-keypad" :style="{width: filteredTotals.keypadPct + '%'}">
              🔢 {{ filteredTotals.keypadPct }}%
            </div>
            <div class="dbar-seg dbar-unknown" :style="{width: filteredTotals.unknownPct + '%'}"
                 v-if="parseFloat(filteredTotals.unknownPct) > 0">
              ❓ {{ filteredTotals.unknownPct }}%
            </div>
          </div>
          <div class="device-bar-legend">
            <span><span class="legend-dot" style="background: #25d366;"></span> Smartphone ({{ filteredTotals.smartphone }}) → WhatsApp + Poster</span>
            <span><span class="legend-dot" style="background: #f59e0b;"></span> Keypad ({{ filteredTotals.keypad }}) → SMS + Voice</span>
            <span><span class="legend-dot" style="background: #64748b;"></span> Unknown ({{ filteredTotals.unknown }}) → SMS fallback</span>
          </div>

          <!-- Channel Matrix -->
          <div class="ch-matrix">
            <div class="ch-matrix-header">
              <span>Channel</span><span>Eligible</span><span>Coverage</span>
            </div>
            <div class="ch-matrix-row">
              <span>💬 WhatsApp Text</span>
              <span class="ch-matrix-val">{{ filteredTotals.smartphone }}</span>
              <span class="ch-matrix-bar-wrap">
                <span class="ch-matrix-bar" :style="{width: filteredTotals.smartphonePct + '%', background: '#25d366'}"></span>
              </span>
            </div>
            <div class="ch-matrix-row">
              <span>🖼️ WhatsApp Poster</span>
              <span class="ch-matrix-val">{{ filteredTotals.smartphone }}</span>
              <span class="ch-matrix-bar-wrap">
                <span class="ch-matrix-bar" :style="{width: filteredTotals.smartphonePct + '%', background: '#10b981'}"></span>
              </span>
            </div>
            <div class="ch-matrix-row">
              <span>🔊 Voice Call (IVR)</span>
              <span class="ch-matrix-val">{{ filteredTotals.keypad + filteredTotals.unknown }}</span>
              <span class="ch-matrix-bar-wrap">
                <span class="ch-matrix-bar" :style="{width: (parseFloat(filteredTotals.keypadPct) + parseFloat(filteredTotals.unknownPct)) + '%', background: '#f59e0b'}"></span>
              </span>
            </div>
            <div class="ch-matrix-row">
              <span>📱 SMS Fallback</span>
              <span class="ch-matrix-val">{{ filteredTotals.total }}</span>
              <span class="ch-matrix-bar-wrap">
                <span class="ch-matrix-bar" style="width: 100%; background: #8b5cf6;"></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- State-wise Breakdown -->
      <div class="card" style="margin-top: 16px;" v-if="stateGroups.length">
        <div class="card-header">
          <span class="card-title">🗺️ State-wise Device Breakdown</span>
          <span style="font-size: 12px; color: var(--text-muted);">{{ stateGroups.length }} states · {{ filteredDistricts.length }} districts</span>
        </div>

        <div v-for="sg in stateGroups" :key="sg.state" class="state-fieldset">
          <div class="fieldset-header" @click="toggle(sg.state)">
            <div class="fieldset-title">
              <span class="fieldset-arrow">{{ expanded[sg.state] ? '▼' : '▶' }}</span>
              <strong>{{ sg.state }}</strong>
              <span class="fieldset-count">{{ sg.total }} farmers · {{ sg.districts.length }} districts</span>
            </div>
            <div class="fieldset-pills">
              <span class="mini-pill green-pill">📱 {{ sg.smartphone }}</span>
              <span class="mini-pill orange-pill">🔢 {{ sg.keypad }}</span>
              <span v-if="sg.unknown > 0" class="mini-pill gray-pill">❓ {{ sg.unknown }}</span>
            </div>
          </div>
          <div v-show="expanded[sg.state]" class="fieldset-body">
            <div v-for="d in sg.districts" :key="d.district" class="ch-district-row">
              <div class="ch-dist-name">
                <strong>{{ d.district }}</strong>
                <span class="ch-dist-meta">{{ d.total }} farmers · avg {{ d.avg_farm }} acres · ~{{ d.avg_age }}y</span>
              </div>
              <div class="ch-dist-bar-wrap">
                <div class="ch-dist-bar">
                  <div class="dbar-seg dbar-smart" :style="{width: d.smartphone_pct + '%'}"></div>
                  <div class="dbar-seg dbar-keypad" :style="{width: d.keypad_pct + '%'}"></div>
                  <div class="dbar-seg dbar-unknown" :style="{width: d.unknown_pct + '%'}"></div>
                </div>
              </div>
              <div class="ch-dist-channels">
                <span class="ch-tag ch-wa" v-if="d.smartphone > 0">💬 {{ d.smartphone }}</span>
                <span class="ch-tag ch-sms" v-if="d.keypad > 0">🔢 {{ d.keypad }}</span>
                <span class="ch-tag ch-unk" v-if="d.unknown > 0">❓ {{ d.unknown }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import axios from 'axios'
import { API } from '../config/api'

export default {
  name: 'ChannelRouting',
  data() {
    return {
      loading: false,
      districts: [],
      totals: {},
      channelPlan: {},
      selectedState: '',
      search: '',
      expanded: {},
    }
  },
  computed: {
    stateList() {
      return [...new Set(this.districts.map(d => d.state))].sort()
    },
    filteredDistricts() {
      let items = this.districts
      if (this.selectedState) items = items.filter(d => d.state === this.selectedState)
      if (this.search) {
        const q = this.search.toLowerCase()
        items = items.filter(d => d.district.toLowerCase().includes(q) || d.state.toLowerCase().includes(q))
      }
      return items
    },
    filteredTotals() {
      const fd = this.filteredDistricts
      const total = fd.reduce((s, d) => s + d.total, 0) || 1
      const smartphone = fd.reduce((s, d) => s + d.smartphone, 0)
      const keypad = fd.reduce((s, d) => s + d.keypad, 0)
      const unknown = fd.reduce((s, d) => s + d.unknown, 0)
      return {
        total: smartphone + keypad + unknown,
        smartphone, keypad, unknown,
        smartphonePct: ((smartphone / total) * 100).toFixed(1),
        keypadPct: ((keypad / total) * 100).toFixed(1),
        unknownPct: ((unknown / total) * 100).toFixed(1),
      }
    },
    stateGroups() {
      const map = {}
      for (const d of this.filteredDistricts) {
        const st = d.state || 'Unknown'
        if (!map[st]) map[st] = { state: st, districts: [], total: 0, smartphone: 0, keypad: 0, unknown: 0 }
        map[st].districts.push(d)
        map[st].total += d.total
        map[st].smartphone += d.smartphone
        map[st].keypad += d.keypad
        map[st].unknown += d.unknown
      }
      return Object.keys(map).sort().map(s => map[s])
    },
  },
  methods: {
    async fetchData() {
      this.loading = true
      try {
        const { data } = await axios.get(`${API}/inventory/channel-routing`)
        this.districts = data.districts || []
        this.totals = data.totals || {}
        this.channelPlan = data.channel_plan || {}
      } catch (e) { console.error('Channel routing fetch error:', e) }
      this.loading = false
    },
    toggle(state) {
      this.expanded = { ...this.expanded, [state]: !this.expanded[state] }
    },
  },
  mounted() {
    this.fetchData()
  },
}
</script>

<style scoped>
/* Channel Plan Cards */
.channel-plan {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.ch-plan-item {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  transition: transform 0.15s, box-shadow 0.15s;
}
.ch-plan-item:hover { transform: translateY(-3px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
.ch-whatsapp { border-left: 4px solid #25d366; }
.ch-voice { border-left: 4px solid #f59e0b; }
.ch-poster { border-left: 4px solid #10b981; }
.ch-total { border-left: 4px solid #8b5cf6; }
.ch-plan-icon { font-size: 30px; }
.ch-plan-info { flex: 1; }
.ch-plan-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.ch-plan-value { font-size: 24px; font-weight: 800; color: var(--text-primary); margin: 2px 0; }
.ch-plan-sub { font-size: 11px; color: var(--text-muted); }
.ch-plan-pct { font-size: 22px; font-weight: 700; color: var(--text-muted); }

/* Device Bar */
.device-bar-overall {
  display: flex; height: 36px;
  border-radius: 10px; overflow: hidden;
  border: 1px solid var(--border);
  margin-bottom: 10px;
}
.dbar-seg {
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600; color: #fff;
  transition: width 0.5s ease; min-width: 0;
}
.dbar-smart { background: #25d366; }
.dbar-keypad { background: #f59e0b; }
.dbar-unknown { background: #64748b; }

.device-bar-legend {
  display: flex; gap: 18px; flex-wrap: wrap;
  font-size: 12px; color: var(--text-secondary);
  margin-bottom: 20px;
}
.legend-dot {
  display: inline-block; width: 8px; height: 8px;
  border-radius: 50%; margin-right: 4px; vertical-align: middle;
}

/* Channel Matrix */
.ch-matrix {
  border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
}
.ch-matrix-header {
  display: grid; grid-template-columns: 180px 80px 1fr;
  padding: 10px 16px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-muted); border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}
.ch-matrix-row {
  display: grid; grid-template-columns: 180px 80px 1fr;
  padding: 10px 16px; font-size: 13px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  align-items: center;
}
.ch-matrix-row:last-child { border-bottom: none; }
.ch-matrix-row:hover { background: var(--bg-card-hover); }
.ch-matrix-val { font-weight: 700; color: var(--text-primary); }
.ch-matrix-bar-wrap {
  height: 6px; border-radius: 3px; background: rgba(0,0,0,0.08); overflow: hidden;
}
.ch-matrix-bar { height: 100%; border-radius: 3px; transition: width 0.5s; }

/* State Fieldsets */
.state-fieldset { border-top: 1px solid var(--border); }
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
.green-pill { background: rgba(37,211,102,0.12); color: #25d366; }
.orange-pill { background: rgba(245,158,11,0.12); color: #f59e0b; }
.gray-pill { background: rgba(100,116,139,0.12); color: #94a3b8; }
.fieldset-body { border-top: 1px solid var(--border); }

/* District Rows */
.ch-district-row {
  display: flex; align-items: center; gap: 14px;
  padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 13px;
}
.ch-district-row:last-child { border-bottom: none; }
.ch-district-row:hover { background: var(--bg-card-hover); }
.ch-dist-name { min-width: 200px; }
.ch-dist-meta { display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.ch-dist-bar-wrap { flex: 1; min-width: 120px; }
.ch-dist-bar {
  display: flex; height: 8px; border-radius: 4px;
  overflow: hidden; background: rgba(0,0,0,0.08);
}
.ch-dist-channels { display: flex; gap: 6px; min-width: 140px; }
.ch-tag { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; }
.ch-wa { background: rgba(37,211,102,0.15); color: #25d366; }
.ch-sms { background: rgba(245,158,11,0.15); color: #f59e0b; }
.ch-unk { background: rgba(100,116,139,0.15); color: #94a3b8; }

@media (max-width: 768px) {
  .channel-plan { grid-template-columns: repeat(2, 1fr); }
  .ch-district-row { flex-wrap: wrap; }
  .ch-dist-name { min-width: 100%; }
  .ch-matrix-header, .ch-matrix-row { grid-template-columns: 140px 60px 1fr; }
}
</style>
