import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import WorldsPage from './pages/WorldsPage.jsx'
import WorldDetailPage from './pages/WorldDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import Login from './pages/Login.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirect root → /worlds */}
            <Route index element={<Navigate to="/worlds" replace />} />

            {/* Worlds routes */}
            <Route path="worlds" element={<WorldsPage />} />
            <Route path="worlds/:id" element={<WorldDetailPage />} />

            {/* Other routes */}
            <Route path="campaigns" element={<CampaignsPage />} />
            <Route path="characters" element={<CharactersPage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}
