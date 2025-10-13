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
