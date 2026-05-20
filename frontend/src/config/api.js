const defaultApiRoot = 'http://localhost:5000'
const configuredApiRoot = (import.meta.env.VITE_API_URL || defaultApiRoot).trim().replace(/\/$/, '')

export const API = configuredApiRoot.endsWith('/api')
  ? configuredApiRoot
  : `${configuredApiRoot}/api`
