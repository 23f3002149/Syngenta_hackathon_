<template>
  <div class="fade-in">
    <div class="page-header">
      <div>
        <h2>Campaign Manager</h2>
        <p class="subtitle">Manage, approve, and monitor agricultural advisory campaigns</p>
      </div>
    </div>

    <!-- Main Tab Switcher: Campaigns / Farmer Responses -->
    <div class="main-tabs">
      <button :class="['main-tab', activeMainTab === 'campaigns' ? 'active' : '']" @click="activeMainTab = 'campaigns'">
        📤 Campaigns
        <span class="main-tab-count">{{ allCampaigns.length }}</span>
      </button>
      <button :class="['main-tab', activeMainTab === 'responses' ? 'active' : '']" @click="activeMainTab = 'responses'; fetchLeads()">
        📥 Farmer Responses
        <span class="main-tab-count response-count" v-if="leads.length > 0">{{ leads.length }}</span>
      </button>
    </div>

    <!-- ═══════════════════════════════════════ -->
    <!-- TAB 1: CAMPAIGNS (existing) -->
    <!-- ═══════════════════════════════════════ -->
    <div v-if="activeMainTab === 'campaigns'">

    <!-- WhatsApp Connect — shows ACTIVE account's code -->
    <div class="wa-connect-bar" :class="{'wa-limited': activeAccount.status === 'limited'}">
      <div class="wa-info">
        <span class="wa-icon">📱</span>
        <span class="wa-label">WhatsApp:</span>
        <span class="wa-number">+1 (415) 523-8886</span>
        <span class="wa-divider">|</span>
        <span class="wa-label">Active Code:</span>
        <span class="wa-code" @click="copyThis(activeAccount.sandbox_code)" style="cursor:pointer" title="Click to copy">
          {{ activeAccount.sandbox_code || 'Loading...' }}
        </span>
        <span class="wa-account-num">Account #{{ activeAccount.active_account || '?' }} / {{ activeAccount.total_accounts || '?' }}</span>
        <span v-if="copied" class="wa-ok">Copied!</span>
        <span v-if="activeAccount.status === 'limited'" class="wa-fail">LIMIT HIT</span>
      </div>
      <div class="wa-actions">
        <button class="btn btn-sm btn-outline" @click="switchAccount" v-if="activeAccount.total_accounts > 1" :disabled="switching">
          {{ switching ? '...' : 'Switch Account' }}
        </button>
        <button class="btn btn-sm btn-outline" @click="sendTestMsg" :disabled="testSending">
          {{ testSending ? 'Sending...' : 'Send Test' }}
        </button>
        <span v-if="testResult === 'sent'" class="wa-ok">Delivered!</span>
        <span v-else-if="testResult === 'limited'" class="wa-fail">Limit hit!</span>
        <span v-else-if="testResult" class="wa-fail">Failed</span>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar">
      <div class="filter-left">
        <!-- Multi-Select State Dropdown -->
        <div class="multi-select" ref="multiSelect">
          <button class="multi-select-btn" @click="showDropdown = !showDropdown">
            <span class="pin-icon">📍</span>
            <span v-if="selectedStates.length === 0">All States</span>
            <span v-else-if="selectedStates.length === 1">{{ selectedStates[0] }}</span>
            <span v-else>{{ selectedStates.length }} States</span>
            <span class="arrow">▾</span>
          </button>
          <div class="dropdown-menu" v-if="showDropdown">
            <input type="text" v-model="stateSearch" placeholder="Search state..." class="dropdown-search" />
            <label class="dropdown-item" @click="selectedStates = []; filterCampaigns()">
              <input type="checkbox" :checked="selectedStates.length === 0" readonly />
              <span>All States</span>
            </label>
            <label class="dropdown-item" v-for="s in filteredStates" :key="s" @click.prevent="toggleState(s)">
              <input type="checkbox" :checked="selectedStates.includes(s)" readonly />
              <span>{{ s }}</span>
            </label>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" v-model="searchQuery" placeholder="Search by district, crop, or disease..."
                 @input="filterCampaigns" class="search-input" />
        </div>
      </div>

      <div class="filter-right">
        <div class="stat-pill total">Total: {{ allCampaigns.length }}</div>
        <div class="stat-pill at-risk">At Risk: {{ allCampaigns.filter(c => c.risk_level === 'HIGH' || c.risk_level === 'MEDIUM').length }}</div>
        <div class="stat-pill healthy">Pending: {{ allCampaigns.filter(c => c.status === 'pending').length }}</div>
        <div class="stat-pill sent">Sent: {{ allCampaigns.filter(c => c.status === 'completed').length }}</div>
      </div>
    </div>

    <!-- Status Filter Tabs -->
    <div style="display: flex; gap: 8px; margin-bottom: 20px;">
      <button :class="['tab-btn', statusFilter === '' ? 'active' : '']" @click="statusFilter = ''; filterCampaigns()">All</button>
      <button :class="['tab-btn', statusFilter === 'pending' ? 'active' : '']" @click="statusFilter = 'pending'; filterCampaigns()">Pending</button>
      <button :class="['tab-btn', statusFilter === 'approved' ? 'active' : '']" @click="statusFilter = 'approved'; filterCampaigns()">Approved</button>
      <button :class="['tab-btn', statusFilter === 'completed' ? 'active' : '']" @click="statusFilter = 'completed'; filterCampaigns()">Completed</button>
    </div>

    <!-- State-wise Grouped Campaigns -->
    <div v-if="Object.keys(groupedCampaigns).length === 0" class="card" style="text-align: center; padding: 40px;">
      <p style="color: var(--text-muted); font-size: 16px;">No campaigns found. Run the pipeline from Dashboard.</p>
    </div>

    <div v-for="(campaigns, state) in groupedCampaigns" :key="state" class="state-section">
      <div class="state-header">
        <div class="state-info">
          <span class="state-dot" :style="{background: getStateColor(campaigns)}"></span>
          <h3 class="state-name">{{ state }}</h3>
          <span class="state-meta">{{ campaigns.length }} campaigns</span>
          <span class="state-risk" v-if="getHighRiskCount(campaigns) > 0">
            · {{ getHighRiskCount(campaigns) }} at risk
          </span>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <!-- Progress bar during batch send -->
          <div class="batch-progress" v-if="batchState === state">
            <div class="batch-bar">
              <div class="batch-fill" :style="{width: batchPercent + '%'}"></div>
            </div>
            <span class="batch-text">{{ batchCurrent }}/{{ batchTotal }} {{ batchDistrict }}</span>
          </div>
          <button class="btn btn-outline btn-sm" 
                  v-if="campaigns.some(c => c.status === 'pending') && batchState !== state"
                  @click="approveAndSendState(state, campaigns)">
            Approve & Send All {{ state }}
          </button>
        </div>
      </div>

      <div class="campaign-grid">
        <div v-for="c in campaigns" :key="c.id" class="campaign-card" :class="cardClass(c)">
          <div class="card-top">
            <div class="district-name">{{ c.district_name || 'District' }}</div>
            <span :class="'risk-badge risk-' + (c.risk_level || 'none').toLowerCase()">
              {{ c.risk_level || 'N/A' }}
            </span>
          </div>

          <div class="card-details">
            <div class="detail-row">
              <span class="detail-label">Crop</span>
              <span class="detail-value">{{ c.crop }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Disease</span>
              <span class="detail-value disease">{{ c.disease }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Product</span>
              <span class="detail-value product">{{ c.product }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Language</span>
              <span class="detail-value">{{ c.language }}</span>
            </div>
          </div>

          <div class="card-footer">
            <span :class="'status-badge status-' + (c.status || 'pending')">
              {{ c.status === 'completed' ? '✅ Sent' : c.status }}
            </span>
            <div class="card-actions">
              <button class="btn-icon" @click="viewDetail(c)" title="View Details">👁️</button>
              <button v-if="c.status === 'pending'" 
                      class="btn btn-primary btn-sm"
                      @click="approveAndSend(c)"
                      :disabled="sending === c.id">
                {{ sending === c.id ? '...' : 'Approve & Send' }}
              </button>
              <button v-else-if="c.status === 'approved'"
                      class="btn btn-primary btn-sm"
                      @click="sendOnly(c)"
                      :disabled="sending === c.id">
                {{ sending === c.id ? '...' : 'Send' }}
              </button>
            </div>
          </div>

          <!-- Channel delivery status strip -->
          <div class="channel-strip" v-if="sending === c.id || sendingBatch === c.id || c.status === 'completed'">
            <!-- During sending: animated -->
            <template v-if="sending === c.id || sendingBatch === c.id">
              <span class="ch-step ch-active">📋 Text<span class="ch-dots"></span></span>
              <span class="ch-arrow">→</span>
              <span class="ch-step">🔊 Voice</span>
              <span class="ch-arrow">→</span>
              <span class="ch-step">🖼️ Poster</span>
            </template>
            <!-- After sent: show what was delivered -->
            <template v-else>
              <span class="ch-step ch-done">📋✓</span>
              <span class="ch-step" :class="c.voice_url ? 'ch-done' : 'ch-skip'">🔊{{ c.voice_url ? '✓' : '—' }}</span>
              <span class="ch-step" :class="c.poster_url ? 'ch-done' : 'ch-skip'">🖼️{{ c.poster_url ? '✓' : '—' }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null">
      <div class="card modal-card">
        <div class="card-header">
          <span class="card-title">Campaign #{{ detail.id }} — {{ detail.district_name }}, {{ detail.state }}</span>
          <button class="btn btn-outline btn-sm" @click="detail = null">✕ Close</button>
        </div>
        <div class="modal-grid">
          <div class="modal-item">
            <div class="modal-label">CROP</div>
            <div class="modal-value">{{ detail.crop }}</div>
          </div>
          <div class="modal-item">
            <div class="modal-label">DISEASE</div>
            <div class="modal-value" style="color: var(--accent-orange);">{{ detail.disease }}</div>
          </div>
          <div class="modal-item">
            <div class="modal-label">PRODUCT</div>
            <div class="modal-value" style="color: var(--accent-green);">{{ detail.product }}</div>
          </div>
          <div class="modal-item">
            <div class="modal-label">LANGUAGE</div>
            <div class="modal-value">{{ detail.language }}</div>
          </div>
        </div>

        <div class="modal-section">
          <div class="modal-section-title">📱 SMS Message</div>
          <div class="modal-content-box">{{ detail.message_sms || 'N/A' }}</div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">💬 WhatsApp Message</div>
          <div class="modal-content-box" style="white-space: pre-wrap;">{{ detail.message_whatsapp || 'N/A' }}</div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">🔊 Voice Script</div>
          <div class="modal-content-box" style="font-style: italic;">{{ detail.message_voice_script || 'N/A' }}</div>
        </div>
        <div class="modal-section">
          <div class="modal-section-title">📋 Poster</div>
          <div class="modal-content-box">
            <strong>{{ detail.poster_headline || '' }}</strong>
            <br>{{ detail.poster_body || 'N/A' }}
          </div>
        </div>
      </div>
    </div>
    </div><!-- end campaigns tab -->

    <!-- ═══════════════════════════════════════ -->
    <!-- TAB 2: FARMER RESPONSES -->
    <!-- ═══════════════════════════════════════ -->
    <div v-if="activeMainTab === 'responses'">

      <!-- Engagement Stats Cards -->
      <div class="engagement-grid" v-if="engagement">
        <div class="eng-card">
          <div class="eng-value">{{ engagement.total_responses }}</div>
          <div class="eng-label">Total Responses</div>
        </div>
        <div class="eng-card highlight">
          <div class="eng-value">{{ engagement.engagement_rate }}%</div>
          <div class="eng-label">Engagement Rate</div>
        </div>
        <div class="eng-card">
          <div class="eng-value">{{ engagement.high_value_leads }}</div>
          <div class="eng-label">High-Value Leads</div>
        </div>
        <div class="eng-card">
          <div class="eng-value">{{ engagement.total_campaigns_sent }}</div>
          <div class="eng-label">Campaigns Sent</div>
        </div>
      </div>

      <!-- Response Type Breakdown -->
      <div class="response-type-bar" v-if="engagement && engagement.by_type && engagement.by_type.length > 0">
        <div class="rtb-item" v-for="t in engagement.by_type" :key="t.feedback_type">
          <span class="rtb-icon">{{ typeIcon(t.feedback_type) }}</span>
          <span class="rtb-label">{{ typeLabel(t.feedback_type) }}</span>
          <span class="rtb-count">{{ t.count }}</span>
        </div>
      </div>

      <!-- Simulate Farmer Reply (Demo) -->
      <div class="card simulate-card">
        <div class="card-header">
          <span class="card-title">🧪 Simulate Farmer Reply (Demo)</span>
        </div>
        <div class="simulate-form">
          <div class="sim-field">
            <label>Phone Number</label>
            <input v-model="simPhone" placeholder="9812345678" class="sim-input" />
          </div>
          <div class="sim-field">
            <label>Reply Code</label>
            <div class="sim-options">
              <button v-for="opt in simOptions" :key="opt.code"
                      :class="['sim-opt', simReply === opt.code ? 'active' : '']"
                      @click="simReply = opt.code">
                <span class="sim-code">{{ opt.code }}</span>
                <span class="sim-desc">{{ opt.desc }}</span>
              </button>
            </div>
          </div>
          <button class="btn btn-primary" @click="simulateReply" :disabled="simulating">
            {{ simulating ? 'Processing...' : 'Simulate Reply' }}
          </button>
          <div v-if="simResult" class="sim-result">
            ✅ Feedback #{{ simResult.feedback_id }} — {{ simResult.label }} (Score: {{ simResult.score }}, Priority: {{ simResult.priority }})
          </div>
        </div>
      </div>

      <!-- Leads Filter -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
        <button :class="['tab-btn', leadFilter === '' ? 'active' : '']" @click="leadFilter = ''; fetchLeads()">All</button>
        <button :class="['tab-btn', leadFilter === 'new' ? 'active' : '']" @click="leadFilter = 'new'; fetchLeads()">🆕 New</button>
        <button :class="['tab-btn', leadFilter === 'assigned' ? 'active' : '']" @click="leadFilter = 'assigned'; fetchLeads()">👤 Assigned</button>
        <button :class="['tab-btn', leadFilter === 'resolved' ? 'active' : '']" @click="leadFilter = 'resolved'; fetchLeads()">✅ Resolved</button>
        <span style="flex:1"></span>
        <button :class="['tab-btn', leadTypeFilter === '' ? 'active' : '']" @click="leadTypeFilter = ''; fetchLeads()">All Types</button>
        <button :class="['tab-btn', leadTypeFilter === 'buy_intent' ? 'active' : '']" @click="leadTypeFilter = 'buy_intent'; fetchLeads()">🛒 Buy Intent</button>
        <button :class="['tab-btn', leadTypeFilter === 'expert_help' ? 'active' : '']" @click="leadTypeFilter = 'expert_help'; fetchLeads()">👨‍🌾 Expert</button>
        <button :class="['tab-btn', leadTypeFilter === 'field_issue' ? 'active' : '']" @click="leadTypeFilter = 'field_issue'; fetchLeads()">🔴 Field Issue</button>
        <button :class="['tab-btn', leadTypeFilter === 'more_info' ? 'active' : '']" @click="leadTypeFilter = 'more_info'; fetchLeads()">ℹ️ Info</button>
      </div>

      <!-- Leads Table -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Farmer Responses ({{ leads.length }})</span>
        </div>
        <div v-if="leads.length === 0" style="text-align: center; padding: 40px; color: var(--text-muted);">
          No responses yet. Run a campaign and simulate farmer replies to see leads here.
        </div>
        <table v-else class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>District</th>
              <th>Crop / Disease</th>
              <th>Type</th>
              <th>Score</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Time</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lead in leads" :key="lead.id">
              <td>{{ lead.id }}</td>
              <td>
                <div style="font-weight: 600;">{{ lead.district || 'Unknown' }}</div>
                <div style="font-size: 11px; color: var(--text-muted);">{{ lead.state }}</div>
              </td>
              <td>
                <div>{{ lead.crop || '—' }}</div>
                <div style="font-size: 11px; color: var(--accent-orange);">{{ lead.disease || '' }}</div>
              </td>
              <td>
                <span :class="'type-badge type-' + (lead.feedback_type || 'general')">
                  {{ typeIcon(lead.feedback_type) }} {{ typeLabel(lead.feedback_type) }}
                </span>
              </td>
              <td>
                <span class="score-badge" :style="{background: scoreColor(lead.score)}">
                  {{ lead.score }}
                </span>
              </td>
              <td>
                <span :class="'priority-badge priority-' + (lead.priority || 'low')">
                  {{ (lead.priority || 'low').toUpperCase() }}
                </span>
              </td>
              <td>
                <span :class="'status-badge status-' + (lead.status || 'new')">
                  {{ lead.status || 'new' }}
                </span>
              </td>
              <td style="font-size: 11px; color: var(--text-muted); white-space: nowrap;">
                {{ formatTime(lead.received_at) }}
              </td>
              <td>
                <div class="lead-actions">
                  <button v-if="lead.status === 'new'" class="btn btn-sm btn-outline"
                          @click="updateLead(lead.id, 'assigned')" title="Assign">
                    👤 Assign
                  </button>
                  <button v-if="lead.status === 'assigned'" class="btn btn-sm btn-primary"
                          @click="updateLead(lead.id, 'resolved')" title="Resolve">
                    ✅ Resolve
                  </button>
                  <button v-if="lead.feedback_type === 'buy_intent'" class="btn btn-sm btn-outline"
                          @click="findRetailer(lead.id)" title="Find Retailer">
                    🏪
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Retailer Modal -->
      <div v-if="retailerInfo" class="modal-overlay" @click.self="retailerInfo = null">
        <div class="card modal-card">
          <div class="card-header">
            <span class="card-title">🏪 Nearest Retailers — {{ retailerInfo.district }}, {{ retailerInfo.state }}</span>
            <button class="btn btn-outline btn-sm" @click="retailerInfo = null">✕ Close</button>
          </div>
          <div style="padding: 16px;">
            <p style="color: var(--text-muted); margin-bottom: 12px;">Product needed: <strong style="color: var(--accent-green);">{{ retailerInfo.product_needed }}</strong></p>
            <div v-if="retailerInfo.retailers.length === 0" style="color: var(--text-muted); text-align: center; padding: 20px;">
              No retailers found in this district.
            </div>
            <div v-for="r in retailerInfo.retailers" :key="r.retailer_id" class="retailer-card">
              <div class="ret-name">{{ r.retailer_name || 'Retailer #' + r.retailer_id }}</div>
              <div class="ret-meta">{{ r.district }}, {{ r.state }}</div>
              <div class="ret-stock" :class="r.has_stock ? 'in-stock' : 'no-stock'">
                {{ r.has_stock ? '✅ In Stock' : '❌ Out of Stock' }}
              </div>
              <div v-if="r.stock && r.stock.length" class="ret-items">
                <span v-for="s in r.stock" :key="s.sku_name" class="ret-sku">
                  {{ s.sku_name }}: {{ s.sku_qty }} units
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div><!-- end responses tab -->

  </div>
</template>

<script>
import axios from 'axios'
import { API } from '../config/api'

export default {
  name: 'Campaigns',
  data() {
    return {
      // Main tab
      activeMainTab: 'campaigns',
      // Campaigns tab
      allCampaigns: [],
      filteredList: [],
      stateList: [],
      selectedStates: [],
      searchQuery: '',
      statusFilter: '',
      stateSearch: '',
      showDropdown: false,
      detail: null,
      sending: null,
      activeAccount: { active_account: 0, total_accounts: 0, sandbox_code: '', status: 'loading' },
      copied: false,
      switching: false,
      testSending: false,
      testResult: null,
      batchState: null,
      batchCurrent: 0,
      batchTotal: 0,
      batchPercent: 0,
      batchDistrict: '',
      sendingBatch: null,
      // Farmer Responses tab
      leads: [],
      leadFilter: '',
      leadTypeFilter: '',
      engagement: null,
      simPhone: '',
      simReply: '1',
      simulating: false,
      simResult: null,
      retailerInfo: null,
      simOptions: [
        { code: '1', desc: 'More Info' },
        { code: '2', desc: 'Expert Help' },
        { code: '3', desc: 'Buy Product' },
        { code: '4', desc: 'Field Issue' },
      ],
    }
  },
  computed: {
    filteredStates() {
      if (!this.stateSearch) return this.stateList
      const q = this.stateSearch.toLowerCase()
      return this.stateList.filter(s => s.toLowerCase().includes(q))
    },
    groupedCampaigns() {
      const groups = {}
      this.filteredList.forEach(c => {
        const state = c.state || 'Unknown'
        if (!groups[state]) groups[state] = []
        groups[state].push(c)
      })
      // Sort states alphabetically
      const sorted = {}
      Object.keys(groups).sort().forEach(k => { sorted[k] = groups[k] })
      return sorted
    }
  },
  mounted() {
    this.fetchCampaigns()
    this.fetchStates()
    this.fetchSandboxInfo()
    document.addEventListener('click', this.handleOutsideClick)
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
  },
  methods: {
    handleOutsideClick(e) {
      if (this.$refs.multiSelect && !this.$refs.multiSelect.contains(e.target)) {
        this.showDropdown = false
      }
    },
    async fetchCampaigns() {
      try {
        const { data } = await axios.get(`${API}/campaign/list?limit=500`)
        this.allCampaigns = data.campaigns || []
        this.filterCampaigns()
      } catch (e) { console.error(e) }
    },
    async fetchStates() {
      try {
        const { data } = await axios.get(`${API}/states`)
        this.stateList = (data.states || []).map(s => s.state).sort()
      } catch (e) { console.error(e) }
    },
    toggleState(state) {
      const idx = this.selectedStates.indexOf(state)
      if (idx === -1) this.selectedStates.push(state)
      else this.selectedStates.splice(idx, 1)
      this.filterCampaigns()
    },
    filterCampaigns() {
      let list = [...this.allCampaigns]
      
      // State filter
      if (this.selectedStates.length > 0) {
        list = list.filter(c => this.selectedStates.includes(c.state))
      }
      
      // Status filter
      if (this.statusFilter) {
        list = list.filter(c => c.status === this.statusFilter)
      }
      
      // Search
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase()
        list = list.filter(c =>
          (c.district_name || '').toLowerCase().includes(q) ||
          (c.crop || '').toLowerCase().includes(q) ||
          (c.disease || '').toLowerCase().includes(q) ||
          (c.product || '').toLowerCase().includes(q) ||
          (c.state || '').toLowerCase().includes(q)
        )
      }
      
      this.filteredList = list
    },
    getStateColor(campaigns) {
      const high = campaigns.filter(c => c.risk_level === 'HIGH').length
      if (high > 0) return '#ef4444'
      const med = campaigns.filter(c => c.risk_level === 'MEDIUM').length
      if (med > 0) return '#f59e0b'
      return '#10b981'
    },
    getHighRiskCount(campaigns) {
      return campaigns.filter(c => c.risk_level === 'HIGH' || c.risk_level === 'MEDIUM').length
    },
    cardClass(c) {
      return {
        'card-high': c.risk_level === 'HIGH',
        'card-medium': c.risk_level === 'MEDIUM',
        'card-completed': c.status === 'completed',
      }
    },
    async viewDetail(campaign) {
      try {
        const { data } = await axios.get(`${API}/campaign/${campaign.id}`)
        this.detail = data
      } catch (e) { this.detail = campaign }
    },
    async approveAndSend(campaign) {
      // Confirm: show active code before sending
      const code = this.activeAccount.sandbox_code || '?'
      const accNum = this.activeAccount.active_account || '?'
      if (!confirm(`Account #${accNum} se bhejega.\nWhatsApp pe "${code}" join kiya hai?\n\nSend karu?`)) return
      
      this.sending = campaign.id
      try {
        await axios.post(`${API}/campaign/approve`, { campaign_ids: [campaign.id], send_now: true })
        await this.refreshActiveInfo()
        this.fetchCampaigns()
      } catch (e) { console.error(e); alert('Error: ' + e.message) }
      this.sending = null
    },
    async sendOnly(campaign) {
      this.sending = campaign.id
      try {
        await axios.post(`${API}/delivery/campaign/${campaign.id}`)
        this.fetchCampaigns()
      } catch (e) { console.error(e); alert('Error: ' + e.message) }
      this.sending = null
    },
    async approveState(state) {
      if (!confirm(`Approve all pending campaigns for ${state}?`)) return
      try {
        const { data } = await axios.post(`${API}/campaign/approve`, { state, send_now: false })
        alert(`Approved ${data.approved} campaigns in ${state}`)
        this.fetchCampaigns()
      } catch (e) { console.error(e) }
    },
    async approveAndSendState(state, campaigns) {
      const code = this.activeAccount.sandbox_code || '?'
      const accNum = this.activeAccount.active_account || '?'
      const pending = campaigns.filter(c => c.status === 'pending' || c.status === 'approved')
      if (pending.length === 0) return
      
      if (!confirm(`${pending.length} campaigns ${state} se bhejega.\nAccount #${accNum} — "${code}" join kiya hai?`)) return
      
      this.batchState = state
      this.batchTotal = pending.length
      this.batchCurrent = 0
      this.batchPercent = 0
      this.batchDistrict = ''
      
      for (const c of pending) {
        this.batchCurrent++
        this.batchPercent = Math.round((this.batchCurrent / this.batchTotal) * 100)
        this.batchDistrict = c.district_name || 'Sending...'
        this.sendingBatch = c.id
        
        try {
          // Approve first if pending
          if (c.status === 'pending') {
            await axios.post(`${API}/campaign/approve`, { campaign_ids: [c.id], send_now: true })
          } else {
            await axios.post(`${API}/delivery/campaign/${c.id}`)
          }
        } catch (e) {
          console.error(`Campaign ${c.id} failed:`, e)
        }
        this.sendingBatch = null
      }
      
      this.batchDistrict = 'Done!'
      await this.refreshActiveInfo()
      this.fetchCampaigns()
      
      setTimeout(() => {
        this.batchState = null
        this.batchCurrent = 0
        this.batchTotal = 0
        this.batchPercent = 0
        this.batchDistrict = ''
      }, 3000)
    },
    async fetchSandboxInfo() {
      await this.refreshActiveInfo()
    },
    async refreshActiveInfo() {
      try {
        const { data } = await axios.get(`${API}/delivery/sandbox-info`)
        this.activeAccount = data
      } catch (e) { console.error(e) }
    },
    async switchAccount() {
      this.switching = true
      try {
        const { data } = await axios.post(`${API}/delivery/switch-account`)
        if (data.switched) {
          alert(`Switched to Account #${data.new_account}\nJoin code: ${data.sandbox_code}\n\nWhatsApp pe ye code bhejo: ${data.sandbox_code}`)
          await this.refreshActiveInfo()
        } else {
          alert(data.error || 'Cannot switch')
        }
      } catch (e) { alert('Switch failed') }
      this.switching = false
    },
    copyThis(code) {
      if (!code) return
      navigator.clipboard.writeText(code)
      this.copied = true
      setTimeout(() => { this.copied = false }, 2000)
    },
    async sendTestMsg() {
      this.testSending = true
      this.testResult = null
      try {
        const { data } = await axios.post(`${API}/delivery/test`, {
          number: '9306241851',
          message: 'KrishiConnect AI - WhatsApp connection test successful!'
        })
        this.testResult = data.status
      } catch (e) { this.testResult = 'error' }
      this.testSending = false
    },
    // ── Farmer Responses Methods ──
    async fetchLeads() {
      try {
        let url = `${API}/leads?limit=100`
        if (this.leadFilter) url += `&status=${this.leadFilter}`
        if (this.leadTypeFilter) url += `&type=${this.leadTypeFilter}`
        const { data } = await axios.get(url)
        this.leads = data.leads || []
      } catch (e) { console.error(e) }
      this.fetchEngagement()
    },
    async fetchEngagement() {
      try {
        const { data } = await axios.get(`${API}/engagement`)
        this.engagement = data
      } catch (e) { console.error(e) }
    },
    async simulateReply() {
      this.simulating = true
      this.simResult = null
      try {
        const { data } = await axios.post(`${API}/webhook/simulate`, {
          phone: this.simPhone || '9999999999',
          reply: this.simReply,
        })
        this.simResult = data.feedback
        this.fetchLeads()
      } catch (e) { console.error(e); alert('Error: ' + e.message) }
      this.simulating = false
    },
    async updateLead(id, status) {
      try {
        await axios.put(`${API}/leads/${id}/status`, { status, assigned_to: 'Field Rep' })
        this.fetchLeads()
      } catch (e) { console.error(e) }
    },
    async findRetailer(feedbackId) {
      try {
        const { data } = await axios.get(`${API}/leads/${feedbackId}/retailer`)
        this.retailerInfo = data
      } catch (e) { console.error(e); alert('No retailer data available') }
    },
    typeIcon(type) {
      const icons = { more_info: 'ℹ️', expert_help: '👨‍🌾', buy_intent: '🛒', field_issue: '🔴', general: '💬' }
      return icons[type] || '💬'
    },
    typeLabel(type) {
      const labels = { more_info: 'More Info', expert_help: 'Expert Help', buy_intent: 'Buy Intent', field_issue: 'Field Issue', general: 'General' }
      return labels[type] || type || 'General'
    },
    scoreColor(score) {
      if (score >= 9) return 'rgba(239,68,68,0.2)'
      if (score >= 7) return 'rgba(245,158,11,0.2)'
      return 'rgba(16,185,129,0.2)'
    },
    formatTime(dt) {
      if (!dt) return '—'
      const d = new Date(dt)
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    },
  }
}
</script>

<style scoped>
/* WhatsApp Connect Bar */
.wa-connect-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(37, 211, 102, 0.08);
  border: 1px solid rgba(37, 211, 102, 0.2);
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
  transition: all 0.3s;
}
.wa-connect-bar.wa-limited {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}
.wa-account-num {
  font-size: 11px;
  color: var(--text-muted);
  opacity: 0.7;
}
.wa-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.wa-icon { font-size: 18px; }
.wa-label { color: var(--text-muted); font-size: 13px; }
.wa-number { color: #25d366; font-weight: 600; font-size: 14px; }
.wa-divider { color: var(--text-muted); opacity: 0.3; }
.wa-code { 
  background: rgba(37, 211, 102, 0.15); 
  color: #25d366; 
  padding: 3px 10px; 
  border-radius: 6px; 
  font-weight: 600; 
  font-size: 13px;
  font-family: monospace;
}
.wa-copy-btn {
  background: none;
  border: 1px solid rgba(37, 211, 102, 0.3);
  color: #25d366;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.wa-copy-btn:hover { background: rgba(37, 211, 102, 0.15); }
.wa-actions { display: flex; align-items: center; gap: 8px; }
.wa-ok { color: #25d366; font-size: 12px; font-weight: 600; }
.wa-fail { color: #ef4444; font-size: 12px; font-weight: 600; }

/* Batch Send Progress */
.batch-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}
.batch-bar {
  width: 120px;
  height: 6px;
  background: rgba(0,0,0,0.1);
  border-radius: 3px;
  overflow: hidden;
}
.batch-fill {
  height: 100%;
  background: linear-gradient(90deg, #25d366, #10b981);
  border-radius: 3px;
  transition: width 0.5s ease;
}
.batch-text {
  font-size: 12px;
  color: #25d366;
  font-weight: 600;
  white-space: nowrap;
}

/* Channel Delivery Strip */
.channel-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(37, 211, 102, 0.05);
  border-top: 1px solid rgba(0,0,0,0.04);
  border-radius: 0 0 12px 12px;
  font-size: 12px;
}
.ch-step {
  color: var(--text-muted);
  opacity: 0.5;
}
.ch-step.ch-active {
  color: #25d366;
  opacity: 1;
  font-weight: 600;
}
.ch-step.ch-done {
  color: #25d366;
  opacity: 1;
}
.ch-step.ch-skip {
  color: var(--text-muted);
  opacity: 0.4;
}
.ch-arrow {
  color: var(--text-muted);
  opacity: 0.3;
  font-size: 10px;
}
.ch-dots::after {
  content: '...';
  animation: dots 1.5s steps(3) infinite;
}
@keyframes dots {
  0% { content: '.'; }
  33% { content: '..'; }
  66% { content: '...'; }
}
/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.filter-left {
  display: flex;
  gap: 12px;
  flex: 1;
}
.filter-right {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Multi-Select Dropdown */
.multi-select {
  position: relative;
}
.multi-select-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s;
}
.multi-select-btn:hover {
  border-color: var(--accent-green);
}
.pin-icon { font-size: 14px; }
.arrow { font-size: 10px; opacity: 0.6; }
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  width: 240px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  z-index: 100;
  padding: 6px;
}
.dropdown-search {
  width: 100%;
  padding: 8px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 12px;
  margin-bottom: 4px;
  outline: none;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.15s;
}
.dropdown-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.dropdown-item input[type="checkbox"] {
  accent-color: var(--accent-green);
}

/* Search */
.search-wrap {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 250px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0 12px;
  transition: border-color 0.2s;
}
.search-wrap:focus-within {
  border-color: var(--accent-green);
}
.search-icon { font-size: 14px; opacity: 0.5; }
.search-input {
  flex: 1;
  padding: 8px 10px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

/* Stat Pills */
.stat-pill {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}
.stat-pill.total { background: rgba(99,102,241,0.15); color: #818cf8; }
.stat-pill.at-risk { background: rgba(239,68,68,0.15); color: #ef4444; }
.stat-pill.healthy { background: rgba(245,158,11,0.15); color: #f59e0b; }
.stat-pill.sent { background: rgba(16,185,129,0.15); color: #10b981; }

/* Tab Buttons */
.tab-btn {
  padding: 6px 16px;
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
.state-section {
  margin-bottom: 28px;
}
.state-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 16px;
}
.state-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.state-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.state-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}
.state-meta {
  font-size: 13px;
  color: var(--text-muted);
}
.state-risk {
  font-size: 13px;
  color: #ef4444;
}

/* Campaign Grid */
.campaign-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

/* Campaign Card */
.campaign-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  transition: all 0.25s;
}
.campaign-card:hover {
  border-color: var(--accent-green);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(16,185,129,0.1);
}
.campaign-card.card-high {
  border-left: 3px solid #ef4444;
}
.campaign-card.card-medium {
  border-left: 3px solid #f59e0b;
}
.campaign-card.card-completed {
  opacity: 0.7;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.district-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
}
.risk-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.risk-high { background: rgba(239,68,68,0.15); color: #ef4444; }
.risk-medium { background: rgba(245,158,11,0.15); color: #f59e0b; }
.risk-low { background: rgba(16,185,129,0.15); color: #10b981; }
.risk-none { background: rgba(156,163,175,0.15); color: #9ca3af; }

.card-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
}
.detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.detail-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
}
.detail-value {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 500;
}
.detail-value.disease { color: var(--accent-orange); }
.detail-value.product { color: var(--accent-green); }

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.status-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}
.status-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-approved { background: rgba(99,102,241,0.15); color: #818cf8; }
.status-completed { background: rgba(16,185,129,0.15); color: #10b981; }

.card-actions {
  display: flex;
  gap: 6px;
  align-items: center;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 6px;
  transition: background 0.15s;
}
.btn-icon:hover {
  background: var(--bg-secondary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.75);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}
.modal-card {
  width: 720px;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.modal-item { }
.modal-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.modal-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.modal-section {
  margin-bottom: 16px;
}
.modal-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.modal-content-box {
  padding: 14px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
}

/* ═══════════════════════════════════════ */
/* MAIN TAB SWITCHER */
/* ═══════════════════════════════════════ */
.main-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 4px;
}
.main-tab {
  flex: 1;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-family: inherit;
}
.main-tab:hover {
  color: var(--text-primary);
  background: var(--bg-card);
}
.main-tab.active {
  background: var(--bg-card);
  color: var(--accent-green);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.main-tab-count {
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}
.main-tab.active .main-tab-count {
  background: rgba(16,185,129,0.15);
  color: var(--accent-green);
}
.main-tab-count.response-count {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
}

/* ═══════════════════════════════════════ */
/* ENGAGEMENT STATS GRID */
/* ═══════════════════════════════════════ */
.engagement-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
.eng-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
  transition: all 0.25s;
}
.eng-card:hover {
  border-color: var(--accent-green);
  transform: translateY(-2px);
}
.eng-card.highlight {
  border-color: rgba(16,185,129,0.4);
  background: linear-gradient(135deg, var(--bg-card), rgba(16,185,129,0.05));
}
.eng-value {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
}
.eng-card.highlight .eng-value {
  color: var(--accent-green);
}
.eng-label {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Response Type Bar */
.response-type-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.rtb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 13px;
}
.rtb-icon { font-size: 16px; }
.rtb-label { color: var(--text-secondary); }
.rtb-count { font-weight: 700; color: var(--text-primary); }

/* ═══════════════════════════════════════ */
/* SIMULATE CARD */
/* ═══════════════════════════════════════ */
.simulate-card {
  margin-bottom: 20px;
}
.simulate-form {
  padding: 16px;
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}
.sim-field label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.sim-input {
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 13px;
  width: 160px;
  outline: none;
  font-family: monospace;
}
.sim-input:focus { border-color: var(--accent-green); }
.sim-options {
  display: flex;
  gap: 6px;
}
.sim-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
  min-width: 70px;
}
.sim-opt:hover { border-color: var(--accent-green); }
.sim-opt.active {
  border-color: var(--accent-green);
  background: rgba(16,185,129,0.1);
}
.sim-code {
  font-size: 18px;
  font-weight: 800;
  color: var(--text-primary);
}
.sim-desc {
  font-size: 10px;
  color: var(--text-muted);
}
.sim-result {
  padding: 10px 16px;
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: 8px;
  color: var(--accent-green);
  font-size: 13px;
  font-weight: 500;
}

/* ═══════════════════════════════════════ */
/* TYPE / PRIORITY / SCORE BADGES */
/* ═══════════════════════════════════════ */
.type-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.type-more_info { background: rgba(99,102,241,0.15); color: #818cf8; }
.type-expert_help { background: rgba(245,158,11,0.15); color: #f59e0b; }
.type-buy_intent { background: rgba(16,185,129,0.15); color: #10b981; }
.type-field_issue { background: rgba(239,68,68,0.15); color: #ef4444; }
.type-general { background: rgba(156,163,175,0.15); color: #9ca3af; }

.priority-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.priority-low { background: rgba(16,185,129,0.15); color: #10b981; }
.priority-high { background: rgba(245,158,11,0.15); color: #f59e0b; }
.priority-critical { background: rgba(239,68,68,0.15); color: #ef4444; }

.score-badge {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 800;
  color: var(--text-primary);
}

.status-new { background: rgba(99,102,241,0.15); color: #818cf8; }
.status-assigned { background: rgba(245,158,11,0.15); color: #f59e0b; }
.status-resolved { background: rgba(16,185,129,0.15); color: #10b981; }

.lead-actions {
  display: flex;
  gap: 4px;
}

/* ═══════════════════════════════════════ */
/* RETAILER MODAL */
/* ═══════════════════════════════════════ */
.retailer-card {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 10px;
}
.ret-name { font-weight: 700; font-size: 14px; color: var(--text-primary); }
.ret-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.ret-stock { font-size: 12px; margin-top: 6px; font-weight: 600; }
.ret-stock.in-stock { color: #10b981; }
.ret-stock.no-stock { color: #ef4444; }
.ret-items { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.ret-sku {
  padding: 3px 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
