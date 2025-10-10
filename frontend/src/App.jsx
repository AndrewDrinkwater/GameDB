import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import WorldsPage from './pages/WorldsPage.jsx'
import WorldDetailPage from './pages/WorldDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
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

            {/* Campaign routes */}
            <Route path="campaigns">
              <Route index element={<Navigate to="/campaigns/my" replace />} />
              <Route path="my" element={<CampaignsPage scope="my" />} />
              <Route path="all" element={<CampaignsPage scope="all" />} />
            </Route>
            <Route path="characters">
              <Route index element={<Navigate to="/characters/my" replace />} />
              <Route path="my" element={<CharactersPage scope="my" />} />
              <Route path="others" element={<CharactersPage scope="others" />} />
              <Route path="all" element={<CharactersPage scope="all" />} />
            </Route>

            {/* Admin-only route */}
            <Route path="users" element={<UsersPage />} />
          </Route>

          {/* Fallback: redirect anything unknown */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}
