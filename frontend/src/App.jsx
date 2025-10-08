// App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout.jsx'
import WorldsPage from './pages/WorldsPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import Login from './pages/Login.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Protected section */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<WorldsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/characters" element={<CharactersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}
