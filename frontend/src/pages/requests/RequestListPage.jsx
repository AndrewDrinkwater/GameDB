import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Filter, Bug, Sparkles } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchRequests } from '../../api/requests.js'
import RequestCard from '../../components/requests/RequestCard.jsx'
import './RequestListPage.css'

export default function RequestListPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'system_admin'
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    isInBacklog: '',
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  const loadRequests = async (page = 1) => {
    setLoading(true)
    try {
      const params = {
        page,
        limit: pagination.limit,
        ...filters,
      }

      // Remove empty filters
      Object.keys(params).forEach((key) => {
        if (params[key] === '' || params[key] === null || params[key] === undefined) {
          delete params[key]
        }
      })

      const response = await fetchRequests(params)
      setRequests(Array.isArray(response?.data) ? response.data : [])
      setPagination(response?.pagination || pagination)
    } catch (err) {
      console.error('Failed to load requests', err)
      alert('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests(1)
  }, [filters])

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      type: '',
      status: '',
      isInBacklog: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  return (
    <div className="request-list-page">
      <div className="request-list-page__header">
        <div>
          <h1>Feature/Bugs</h1>
          <div className="request-list-page__subtitle-wrapper">
            <p className="request-list-page__subtitle">
              {isAdmin ? 'All bug reports and feature requests' : 'Your bug reports and feature requests'}
            </p>
            {isAdmin && (
              <span className="request-list-page__admin-badge">Admin View</span>
            )}
          </div>
        </div>
        <Link to="/requests/new" className="request-list-page__create-button">
          <Plus size={20} />
          New Request
        </Link>
      </div>

      <div className="request-list-page__filters">
        <div className="request-list-page__filter-group">
          <Filter size={16} />
          <label htmlFor="filter-type">Type:</label>
          <select
            id="filter-type"
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="request-list-page__filter-select"
          >
            <option value="">All</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
          </select>
        </div>

        <div className="request-list-page__filter-group">
          <label htmlFor="filter-status">Status:</label>
          <select
            id="filter-status"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="request-list-page__filter-select"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="testing">Testing</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="backlog">Backlog</option>
          </select>
        </div>

        {isAdmin && (
          <div className="request-list-page__filter-group">
            <label htmlFor="filter-backlog">Backlog:</label>
            <select
              id="filter-backlog"
              value={filters.isInBacklog}
              onChange={(e) => handleFilterChange('isInBacklog', e.target.value)}
              className="request-list-page__filter-select"
            >
              <option value="">All</option>
              <option value="true">In Backlog</option>
              <option value="false">Not in Backlog</option>
            </select>
          </div>
        )}

        {hasActiveFilters && (
          <button onClick={clearFilters} className="request-list-page__clear-filters">
            Clear Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="request-list-page__loading">Loading requests...</div>
      ) : requests.length === 0 ? (
        <div className="request-list-page__empty">
          <p>No requests found</p>
          <Link to="/requests/new" className="request-list-page__empty-link">
            Create your first request
          </Link>
        </div>
      ) : (
        <>
          <div className="request-list-page__grid">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="request-list-page__pagination">
              <button
                onClick={() => loadRequests(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="request-list-page__pagination-button"
              >
                Previous
              </button>
              <span className="request-list-page__pagination-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                onClick={() => loadRequests(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="request-list-page__pagination-button"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

