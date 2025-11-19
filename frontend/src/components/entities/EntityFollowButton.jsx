import { useState, useEffect } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { followEntity, unfollowEntity, checkFollowStatus } from '../../api/entityFollows.js'
import './EntityFollowButton.css'

export default function EntityFollowButton({ entityId }) {
  const { user } = useAuth()
  const { selectedCampaignId } = useCampaignContext()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!entityId || !selectedCampaignId || !user?.id) {
      setChecking(false)
      return
    }

    const checkStatus = async () => {
      try {
        setChecking(true)
        const response = await checkFollowStatus(entityId, selectedCampaignId)
        setFollowing(response?.following ?? false)
      } catch (err) {
        console.error('Failed to check follow status', err)
        setFollowing(false)
      } finally {
        setChecking(false)
      }
    }

    checkStatus()
  }, [entityId, selectedCampaignId, user?.id])

  const handleToggle = async () => {
    if (!entityId || !selectedCampaignId || loading || checking) return

    const newFollowing = !following

    setLoading(true)
    try {
      if (newFollowing) {
        await followEntity(entityId, selectedCampaignId)
      } else {
        await unfollowEntity(entityId, selectedCampaignId)
      }
      setFollowing(newFollowing)
    } catch (err) {
      console.error('Failed to toggle follow', err)
      // Revert state on error
      setFollowing(!newFollowing)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedCampaignId) {
    // Don't show button if no campaign context
    return null
  }

  if (checking) {
    return (
      <button
        type="button"
        className="entity-follow-button"
        disabled
        title="Checking follow status..."
      >
        <Bell size={18} />
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`entity-follow-button ${following ? 'following' : ''}`}
      onClick={handleToggle}
      disabled={loading}
      title={following ? 'Unfollow entity' : 'Follow entity'}
    >
      {following ? <BellRing size={18} /> : <Bell size={18} />}
    </button>
  )
}

