import { useState, useEffect } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { followLocation, unfollowLocation, checkLocationFollowStatus } from '../../api/locationFollows.js'
import '../entities/EntityFollowButton.css'

export default function LocationFollowButton({ locationId }) {
  const { user } = useAuth()
  const { selectedCampaignId } = useCampaignContext()
  const [following, setFollowing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!locationId || !selectedCampaignId || !user?.id) {
      setChecking(false)
      return
    }

    const checkStatus = async () => {
      try {
        setChecking(true)
        const response = await checkLocationFollowStatus(locationId, selectedCampaignId)
        setFollowing(response?.following ?? false)
      } catch (err) {
        console.error('Failed to check location follow status', err)
        setFollowing(false)
      } finally {
        setChecking(false)
      }
    }

    checkStatus()
  }, [locationId, selectedCampaignId, user?.id])

  const handleToggle = async () => {
    if (!locationId || !selectedCampaignId || loading || checking) return

    const newFollowing = !following

    setLoading(true)
    try {
      if (newFollowing) {
        await followLocation(locationId, selectedCampaignId)
      } else {
        await unfollowLocation(locationId, selectedCampaignId)
      }
      setFollowing(newFollowing)
    } catch (err) {
      console.error('Failed to toggle location follow', err)
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
      title={following ? 'Unfollow location' : 'Follow location'}
    >
      {following ? <BellRing size={18} /> : <Bell size={18} />}
    </button>
  )
}

