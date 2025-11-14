import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, History, Loader2, RotateCcw, ShieldCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchWorlds } from '../../api/worlds.js'
import { fetchBulkAccessRunDetail, fetchBulkAccessRuns, revertBulkAccessRun } from '../../api/access.js'
import './BulkAccessToolPage.css'
import './BulkAccessAuditPage.css'

const normaliseListResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch (error) {
    return value
  }
}

const formatAudience = (values = []) => {
  if (!Array.isArray(values) || values.length === 0) return '—'
  return values.join(', ')
}

export default function BulkAccessAuditPage() {
  const { worldId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [world, setWorld] = useState(null)
  const [worldError, setWorldError] = useState('')
  const [loadingWorld, setLoadingWorld] = useState(true)
  const [runs, setRuns] = useState([])
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState('')
  const [selectedRun, setSelectedRun] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [actionError, setActionError] = useState('')
  const [reverting, setReverting] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  const isOwner = useMemo(() => {
    if (!world || !user) return false
    return String(world.created_by) === String(user.id)
  }, [world, user])

  useEffect(() => {
    if (!worldId) {
      setWorldError('Missing world id')
      setLoadingWorld(false)
      return
    }

    const loadWorld = async () => {
      setLoadingWorld(true)
      setWorldError('')
      try {
        const response = await fetchWorlds()
        const worlds = normaliseListResponse(response)
        const found = worlds.find((entry) => String(entry.id) === String(worldId))
        if (!found) {
          setWorldError('World not found or unavailable')
          setWorld(null)
          return
        }
        setWorld(found)
      } catch (error) {
        console.error('Failed to load worlds', error)
        setWorldError(error.message || 'Unable to load world data')
        setWorld(null)
      } finally {
        setLoadingWorld(false)
      }
    }

    loadWorld()
  }, [worldId])

  const handleSelectRun = useCallback(
    async (runId) => {
      if (!runId) return
      setSelectedRunId(runId)
      setLoadingDetail(true)
      setActionError('')
      try {
        const response = await fetchBulkAccessRunDetail(runId)
        const data = response?.data || response
        setSelectedRun(data)
      } catch (error) {
        console.error('Failed to load run detail', error)
        setActionError(error.message || 'Unable to load run details')
        setSelectedRun(null)
      } finally {
        setLoadingDetail(false)
      }
    },
    [],
  )

  const loadRuns = useCallback(async () => {
    if (!worldId || !isOwner) return
    setLoadingRuns(true)
    setActionError('')
    try {
      const response = await fetchBulkAccessRuns({ worldId })
      const data = normaliseListResponse(response)
      setRuns(data)

      if (data.length === 0) {
        setSelectedRun(null)
        setSelectedRunId('')
        return
      }

      if (!selectedRunId || !data.some((run) => run.id === selectedRunId)) {
        await handleSelectRun(data[0].id)
      }
    } catch (error) {
      console.error('Failed to load bulk runs', error)
      setActionError(error.message || 'Unable to load audit runs')
      setRuns([])
    } finally {
      setLoadingRuns(false)
    }
  }, [handleSelectRun, isOwner, selectedRunId, worldId])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  const handleRevert = async () => {
    if (!selectedRunId || !window.confirm('Revert this entire run? This cannot be undone.')) {
      return
    }

    setReverting(true)
    setActionError('')
    setActionSuccess('')

    try {
      const response = await revertBulkAccessRun(selectedRunId)
      const data = response?.data || response
      setActionSuccess(`Run ${data.runId} reverted successfully.`)
      await loadRuns()
      await handleSelectRun(selectedRunId)
    } catch (error) {
      console.error('Failed to revert run', error)
      setActionError(error.message || 'Unable to revert run')
    } finally {
      setReverting(false)
    }
  }

  const runStatus = (run) => (run?.reverted ? 'Reverted' : 'Active')

  const renderDiffRow = (label, oldValue, newValue) => (
    <div className="audit-diff-row" key={label}>
      <span className="audit-diff-label">{label}</span>
      <div className="audit-diff-values">
        <span className="old">{oldValue}</span>
        <ArrowRight size={14} />
        <span className="new">{newValue}</span>
      </div>
    </div>
  )

  if (loadingWorld) {
    return (
      <div className="bulk-audit-page">
        <p className="bulk-access-helper">
          <Loader2 className="spin" size={16} /> Loading world context…
        </p>
      </div>
    )
  }

  if (worldError) {
    return (
      <div className="bulk-audit-page">
        <div className="bulk-access-alert error">
          <AlertTriangle size={16} /> {worldError}
        </div>
        <button type="button" className="link-button" onClick={() => navigate(-1)}>
          Go back
        </button>
      </div>
    )
  }

  if (!isOwner) {
    return (
      <div className="bulk-audit-page">
        <div className="bulk-access-alert warning">
          <AlertTriangle size={16} /> Only the world owner can view audit runs.
        </div>
      </div>
    )
  }

  return (
    <div className="bulk-audit-page">
      <div className="bulk-access-header">
        <div>
          <p className="bulk-access-eyebrow">World Admin · Access Audit</p>
          <h1>Bulk Access Runs · {world?.name}</h1>
        </div>
        <div className="bulk-access-header-actions">
          <Link to={`/worlds/${worldId}/access/bulk`} className="ghost-button">
            Back to editor
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="bulk-access-alert error">
          <AlertTriangle size={16} /> {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="bulk-access-alert success">
          <ShieldCheck size={16} /> {actionSuccess}
        </div>
      )}

      <div className="bulk-audit-grid">
        <section className="bulk-access-card">
          <header>
            <h2>
              <History size={18} /> Audit runs ({runs.length})
            </h2>
            <button type="button" className="ghost-button" onClick={loadRuns} disabled={loadingRuns}>
              {loadingRuns ? (
                <>
                  <Loader2 className="spin" size={14} /> Refreshing…
                </>
              ) : (
                'Refresh'
              )}
            </button>
          </header>
          <div className="audit-run-list">
            {loadingRuns && (
              <p className="bulk-access-helper">
                <Loader2 className="spin" size={16} /> Loading runs…
              </p>
            )}
            {!loadingRuns && runs.length === 0 && (
              <p className="bulk-access-helper">No bulk access runs have been recorded for this world.</p>
            )}
            {!loadingRuns &&
              runs.map((run) => (
                <button
                  key={run.id}
                  type="button"
                  className={`audit-run-row ${selectedRunId === run.id ? 'active' : ''}`}
                  onClick={() => handleSelectRun(run.id)}
                >
                  <div>
                    <p className="audit-run-title">Run {run.id}</p>
                    <p className="audit-run-meta">
                      {formatDateTime(run.createdAt || run.created_at)} · {run.change_count || run.entity_count || 0} entities
                    </p>
                    <p className="audit-run-meta">
                      {run.campaignContext?.name ? `Campaign · ${run.campaignContext.name}` : 'Scope · World'} ·
                      {run.role_used === 'dm' ? ' DM run' : ' Owner run'}
                    </p>
                  </div>
                  <span className={`status-pill ${run.reverted ? 'reverted' : 'active'}`}>{runStatus(run)}</span>
                </button>
              ))}
          </div>
        </section>

        <section className="bulk-access-card">
          <header>
            <h2>Run details</h2>
            {selectedRun && (
              <button
                type="button"
                className="ghost-button"
                onClick={handleRevert}
                disabled={selectedRun.reverted || reverting}
              >
                {reverting ? (
                  <>
                    <Loader2 className="spin" size={14} /> Reverting…
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} /> Revert run
                  </>
                )}
              </button>
            )}
          </header>

          {!selectedRun && (
            <p className="bulk-access-helper">Select a run to see the access changes.</p>
          )}

          {loadingDetail && (
            <p className="bulk-access-helper">
              <Loader2 className="spin" size={16} /> Loading details…
            </p>
          )}

          {selectedRun && !loadingDetail && (
            <div className="audit-detail">
              <div className="audit-detail-meta">
                <p>
                  <strong>Status:</strong> {selectedRun.reverted ? 'Reverted' : 'Active'}
                </p>
                <p>
                  <strong>Actor:</strong> {selectedRun.actor?.username || 'Unknown user'}
                </p>
                <p>
                  <strong>Actor role:</strong> {selectedRun.role_used === 'dm' ? 'Campaign DM' : 'World owner'}
                </p>
                <p>
                  <strong>Scope:</strong> {selectedRun.campaignContext?.name || 'World-wide'}
                </p>
                <p>
                  <strong>Created:</strong> {formatDateTime(selectedRun.createdAt || selectedRun.created_at)}
                </p>
                {selectedRun.description && (
                  <p>
                    <strong>Description:</strong> {selectedRun.description}
                  </p>
                )}
              </div>

              <div className="audit-changes">
                {selectedRun.changes?.map((change) => {
                  const entityName = change.entity?.name || change.entity_id
                  return (
                    <div key={change.id} className="audit-change-card">
                      <div className="audit-change-header">
                        <p className="audit-change-title">{entityName}</p>
                        <span className="audit-change-subtitle">Entity {change.entity_id}</span>
                      </div>
                      <div className="audit-change-body">
                        {renderDiffRow(
                          'Read access',
                          change.old_read_access,
                          change.entity?.read_access || '—',
                        )}
                        {renderDiffRow(
                          'Write access',
                          change.old_write_access,
                          change.entity?.write_access || '—',
                        )}
                        {renderDiffRow(
                          'Read campaigns',
                          formatAudience(change.old_read_campaign_ids),
                          formatAudience(change.entity?.read_campaign_ids),
                        )}
                        {renderDiffRow(
                          'Read users',
                          formatAudience(change.old_read_user_ids),
                          formatAudience(change.entity?.read_user_ids),
                        )}
                        {renderDiffRow(
                          'Read characters',
                          formatAudience(change.old_read_character_ids),
                          formatAudience(change.entity?.read_character_ids),
                        )}
                        {renderDiffRow(
                          'Write campaigns',
                          formatAudience(change.old_write_campaign_ids),
                          formatAudience(change.entity?.write_campaign_ids),
                        )}
                        {renderDiffRow(
                          'Write users',
                          formatAudience(change.old_write_user_ids),
                          formatAudience(change.entity?.write_user_ids),
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
