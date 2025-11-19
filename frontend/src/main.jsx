// Suppress defaultProps warning from react-mentions library (third-party issue)
// This must run BEFORE React imports to catch warnings during module loading
if (import.meta.env.DEV) {
  const shouldSuppressWarning = (args) => {
    // Convert all arguments to a single string for pattern matching
    const message = args.map(arg => String(arg)).join(' ')
    
    // Match the specific warning: "Mention2: Support for defaultProps..."
    return message.includes('Mention2') && message.includes('defaultProps')
  }

  const originalError = console.error
  console.error = (...args) => {
    if (shouldSuppressWarning(args)) {
      // Suppress this specific warning from react-mentions
      return
    }
    originalError.apply(console, args)
  }

  const originalWarn = console.warn
  console.warn = (...args) => {
    if (shouldSuppressWarning(args)) {
      // Suppress this specific warning from react-mentions
      return
    }
    originalWarn.apply(console, args)
  }
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './style.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { CampaignProvider } from './context/CampaignContext.jsx'
import { FeatureFlagProvider } from './context/FeatureFlagContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <FeatureFlagProvider>
        <AuthProvider>
          <CampaignProvider>
            <App />
          </CampaignProvider>
        </AuthProvider>
      </FeatureFlagProvider>
    </ThemeProvider>
  </StrictMode>,
)
