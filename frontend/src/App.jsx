import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import WorldsPage from './pages/WorldsPage.jsx'
import WorldDetailPage from './pages/WorldDetailPage.jsx'
import CampaignsPage from './pages/CampaignsPage.jsx'
import CharactersPage from './pages/CharactersPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import Login from './pages/Login.jsx'
import EntityList from './pages/entities/EntityList.jsx'
import EntityDetailPage from './pages/entities/EntityDetailPage.jsx'
import EntityTypeList from './pages/entityTypes/EntityTypeList.jsx'
import EntityTypeFields from './pages/entityTypes/EntityTypeFields.jsx'
import CreateEntityType from './pages/entityTypes/CreateEntityType.jsx'
import EntityRelationshipList from './pages/relationships/EntityRelationshipList.jsx'
import RelationshipTypeList from './pages/relationshipTypes/RelationshipTypeList.jsx'
import CreateRelationshipType from './pages/relationshipTypes/CreateRelationshipType.jsx'
import EditRelationshipType from './pages/relationshipTypes/EditRelationshipType.jsx'
import EntitySecretList from './pages/secrets/EntitySecretList.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import RelationshipViewerPage from './pages/entities/RelationshipViewerPage.jsx'
import BulkUploadPage from './pages/entities/BulkUploadPage.jsx'
import SessionNotesPage from './pages/notes/SessionNotesPage.jsx'
import EntityNotesPage from './pages/notes/EntityNotesPage.jsx'
import BulkAccessToolPage from './pages/access/BulkAccessToolPage.jsx'
import BulkAccessAuditPage from './pages/access/BulkAccessAuditPage.jsx'
import CollectionsManagerPage from './pages/access/CollectionsManagerPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import NotificationListPage from './pages/notifications/NotificationListPage.jsx'
import FollowedEntitiesPage from './pages/entities/FollowedEntitiesPage.jsx'
import RequestListPage from './pages/requests/RequestListPage.jsx'
import RequestDetailPage from './pages/requests/RequestDetailPage.jsx'
import CreateRequestPage from './pages/requests/CreateRequestPage.jsx'

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
        {/* Home */}
        <Route index element={<HomePage />} />

        {/* Worlds routes */}
        <Route path="worlds" element={<WorldsPage />} />
        <Route path="worlds/:id" element={<WorldDetailPage />} />
        <Route path="worlds/:worldId/access/bulk" element={<BulkAccessToolPage />} />
        <Route path="worlds/:worldId/access/audit" element={<BulkAccessAuditPage />} />
        <Route path="worlds/:worldId/collections" element={<CollectionsManagerPage />} />
        <Route path="campaigns/:campaignId/access/bulk" element={<BulkAccessToolPage />} />

        {/* Campaign routes */}
        <Route path="campaigns">
          <Route index element={<Navigate to="/campaigns/my" replace />} />
          <Route path="my" element={<CampaignsPage scope="my" />} />
          <Route path="my/:id" element={<CampaignsPage scope="my" />} />
          <Route path="all" element={<CampaignsPage scope="all" />} />
          <Route path="all/:id" element={<CampaignsPage scope="all" />} />
        </Route>

        {/* Entity routes */}
        <Route path="entities" element={<EntityList />} />
        <Route path="entities/bulk-upload" element={<BulkUploadPage />} />
        <Route path="entities/followed" element={<FollowedEntitiesPage />} />
        <Route
          path="entities/:entityId/relationship-viewer"
          element={<RelationshipViewerPage />}
        />
        <Route path="entities/:id" element={<EntityDetailPage />} />

        <Route path="entity-types">
          <Route index element={<EntityTypeList />} />
          <Route path="new" element={<CreateEntityType />} />
          <Route path=":id/fields" element={<EntityTypeFields />} />
        </Route>

        <Route path="relationship-types">
          <Route index element={<RelationshipTypeList />} />
          <Route path="new" element={<CreateRelationshipType />} />
          <Route path=":id/edit" element={<EditRelationshipType />} />
        </Route>

        <Route path="entity-relationships" element={<EntityRelationshipList />} />
        <Route path="entity-secrets" element={<EntitySecretList />} />

        <Route path="notes">
          <Route index element={<Navigate to="/notes/session" replace />} />
          <Route path="session" element={<SessionNotesPage />} />
          <Route path="entities" element={<EntityNotesPage />} />
        </Route>

        <Route path="characters">
          <Route index element={<Navigate to="/characters/my" replace />} />
          <Route path="my" element={<CharactersPage scope="my" />} />
          <Route path="my/:id" element={<CharactersPage scope="my" />} />
          <Route path="others" element={<CharactersPage scope="others" />} />
          <Route path="others/:id" element={<CharactersPage scope="others" />} />
          <Route path="companions" element={<CharactersPage scope="companions" />} />
          <Route path="companions/:id" element={<CharactersPage scope="companions" />} />
          <Route path="all" element={<CharactersPage scope="all" />} />
          <Route path="all/:id" element={<CharactersPage scope="all" />} />
        </Route>

        {/* Admin-only route */}
        <Route path="users" element={<UsersPage />} />

        {/* Security route */}
        <Route path="security" element={<SettingsPage />} />

        {/* Notifications route */}
        <Route path="notifications" element={<NotificationListPage />} />

        {/* Requests routes */}
        <Route path="requests">
          <Route index element={<RequestListPage />} />
          <Route path="new" element={<CreateRequestPage />} />
          <Route path=":id" element={<RequestDetailPage />} />
        </Route>
      </Route>

      {/* Fallback: redirect anything unknown */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </>,
  ),
)

export default function App() {
  return <RouterProvider router={router} />
}
