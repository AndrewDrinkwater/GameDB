// Unified API base configuration
// Uses VITE_API_BASE environment variable, falls back to localhost for development
export const API_BASE =
  (import.meta.env.VITE_API_BASE &&
    import.meta.env.VITE_API_BASE.replace(/\/$/, '')) ||
  'http://localhost:3000/api'

