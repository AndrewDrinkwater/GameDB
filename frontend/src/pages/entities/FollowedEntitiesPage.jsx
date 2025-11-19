import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, BellRing, Filter } from 'lucide-react'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { getFollowedEntities, unfollowEntity } from '../../api/entityFollows.js'
import './FollowedEntitiesPage.css'

export default function FollowedEntitiesPage() {
  const { selectedCampaignId, campaigns } = useCampaignContext()
  const [followedEntities, setFollowedEntities] = useState([])
  const [loading, setLoading] = useState(false)
  const [campaignFilter, setCampaignFilter] = useState(selectedCampaignId || '')
  const [unfollowing, setUnfollowing] = useState(null)

  const loadFollowedEntities = async () => {
    setLoading(true)
    try {
      const response = await getFollowedEntities(campaignFilter || undefined)
      const data = Array.isArray(response?.data) ? response.data : []
      setFollowedEntities(data)
    } catch (err) {
      console.error('Failed to load followed entities', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFollowedEntities()
  }, [campaignFilter])

  const handleUnfollow = async (entityId, campaignId) => {
    if (!entityId || !campaignId || unfollowing === entityId) return

    setUnfollowing(entityId)
    try {
      await unfollowEntity(entityId, campaignId)
      setFollowedEntities((prev) => prev.filter((fe) => !(fe.entityId === entityId && fe.campaignId === campaignId)))
    } catch (err) {
      console.error('Failed to unfollow entity', err)
    } finally {
      setUnfollowing(null)
    }
  }

  const campaignOptions = useMemo(() => {
    return [
      { value: '', label: 'All campaigns' },
      ...(campaigns || []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ]
  }, [campaigns])

  // Group by campaign
  const groupedByCampaign = useMemo(() => {
    const groups = {}
    followedEntities.forEach((fe) => {
      const key = fe.campaignId || 'no-campaign'
      if (!groups[key]) {
        groups[key] = {
          campaign: fe.campaign,
          entities: [],
        }
      }
      groups[key].entities.push(fe)
    })
    return groups
  }, [followedEntities])

  return (
    <div className="followed-entities-page">
      <div className="followed-entities-header">
        <h1>Followed Entities</h1>
        <div className="followed-entities-actions">
          <select
            className="followed-entities-filter"
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
          >
            {campaignOptions.map((campaign) => (
              <option key={campaign.value} value={campaign.value}>
                {campaign.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="followed-entities-content">
        {loading ? (
          <div className="followed-entities-empty">Loading...</div>
        ) : followedEntities.length === 0 ? (
          <div className="followed-entities-empty">
            <p>No followed entities found.</p>
            <p className="followed-entities-empty-hint">
              Follow entities from their detail pages to receive notifications when they&apos;re commented on or mentioned.
            </p>
          </div>
        ) : (
          <div className="followed-entities-list">
            {Object.entries(groupedByCampaign).map(([key, group]) => (
              <div key={key} className="followed-entities-group">
                <h2 className="followed-entities-group-title">
                  {group.campaign?.name || 'No campaign context'}
                </h2>
                <div className="followed-entities-items">
                  {group.entities.map((fe) => (
                    <div key={`${fe.entityId}-${fe.campaignId}`} className="followed-entities-item">
                      <Link
                        to={`/entities/${fe.entityId}${fe.campaignId ? `?campaignId=${fe.campaignId}` : ''}`}
                        className="followed-entities-item-link"
                      >
                        <div className="followed-entities-item-content">
                          <h3 className="followed-entities-item-name">{fe.entity?.name || 'Unnamed entity'}</h3>
                          {fe.entity?.entityType && (
                            <span className="followed-entities-item-type">
                              {fe.entity.entityType.name}
                            </span>
                          )}
                        </div>
                      </Link>
                      <button
                        type="button"
                        className="followed-entities-item-unfollow"
                        onClick={() => handleUnfollow(fe.entityId, fe.campaignId)}
                        disabled={unfollowing === fe.entityId}
                        title="Unfollow"
                      >
                        {unfollowing === fe.entityId ? (
                          <Bell size={18} />
                        ) : (
                          <BellRing size={18} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

