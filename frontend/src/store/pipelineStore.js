// KrishiConnect - Global Pipeline Store (no Vuex needed!)
// This persists across component navigation — Vue reactive object
import { reactive } from 'vue'

export const pipelineStore = reactive({
  // Pipeline state
  running: false,
  progress: 0,
  total: 0,
  phase: '',
  latest: '',
  
  // Results (persist across page navigation)
  result: null,
  expandedStates: {},
  
  // EventSource reference
  _source: null,
  
  // Reset for new run
  startRun() {
    this.running = true
    this.progress = 0
    this.total = 0
    this.phase = 'Initializing pipeline...'
    this.latest = ''
    this.result = {
      district_health: [],
      campaigns: [],
      healthy: 0,
      at_risk: 0,
      campaigns_created: 0,
      total_districts: 0,
      season: '',
      state_filter: '',
    }
    this.expandedStates = {}
  },
  
  // Finish
  finish() {
    this.running = false
    if (this._source) {
      this._source.close()
      this._source = null
    }
  },
  
  // Clear all data (used after admin reset)
  clearStore() {
    this.running = false
    this.progress = 0
    this.total = 0
    this.phase = ''
    this.latest = ''
    this.result = null
    this.expandedStates = {}
    if (this._source) {
      this._source.close()
      this._source = null
    }
  },
  
  // Progress percent
  get progressPercent() {
    if (!this.total) return 0
    return Math.round((this.progress / this.total) * 100)
  },
})
