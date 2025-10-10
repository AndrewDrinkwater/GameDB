import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'
import Layout from './components/Layout.jsx'
import WorldsPage from './pages/WorldsPage.jsx'
import WorldDetailPage from './pages/WorldDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import Login from './pages/Login.jsx'
import EntityList from './pages/entities/EntityList.jsx'
import EntityTypeList from './pages/entityTypes/EntityTypeList.jsx'
import EntityTypeFields from './pages/entityTypes/EntityTypeFields.jsx'
import EntityRelationshipList from './pages/relationships/EntityRelationshipList.jsx'
import EntitySecretList from './pages/secrets/EntitySecretList.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
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
          <Route path="my/:id" element={<CampaignsPage scope="my" />} />
          <Route path="all" element={<CampaignsPage scope="all" />} />
          <Route path="all/:id" element={<CampaignsPage scope="all" />} />
        </Route>
        <Route path="entities" element={<EntityList />} />
        <Route path="entity-types" element={<EntityTypeList />} />
        <Route path="entity-types/:id/fields" element={<EntityTypeFields />} />
        <Route path="entity-relationships" element={<EntityRelationshipList />} />
        <Route path="entity-secrets" element={<EntitySecretList />} />
        <Route path="characters">
          <Route index element={<Navigate to="/characters/my" replace />} />
          <Route path="my" element={<CharactersPage scope="my" />} />
          <Route path="my/:id" element={<CharactersPage scope="my" />} />
          <Route path="others" element={<CharactersPage scope="others" />} />
          <Route path="others/:id" element={<CharactersPage scope="others" />} />
          <Route path="all" element={<CharactersPage scope="all" />} />
          <Route path="all/:id" element={<CharactersPage scope="all" />} />
        </Route>

        {/* Admin-only route */}
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Fallback: redirect anything unknown */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </>,
  ),
)

export default function App() {
  return <RouterProvider router={router} />
}
