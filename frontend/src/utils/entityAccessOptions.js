import { fetchCampaigns } from '../api/campaigns.js'
import { fetchCharacters } from '../api/characters.js'

const normaliseOptionLabel = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value.trim()
}

export const normaliseAccessOptionsResponse = (response) => {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

export async function fetchAccessOptionsForWorld(worldId) {
  if (!worldId) {
    return { campaigns: [], users: [] }
  }

  const [campaignResponse, characterResponse] = await Promise.all([
    fetchCampaigns({ world_id: worldId }),
    fetchCharacters({ world_id: worldId }),
  ])

  const campaignData = normaliseAccessOptionsResponse(campaignResponse)
  const campaigns = campaignData.map((item) => ({
    value: String(item.id),
    label: item.name || 'Untitled campaign',
  }))

  const characterData = normaliseAccessOptionsResponse(characterResponse)
  const userMap = new Map()

  characterData.forEach((character) => {
    const userId = character?.user_id || character?.player?.id
    if (!userId) return

    const key = String(userId)
    if (userMap.has(key)) return

    const player = character?.player || {}
    const username = normaliseOptionLabel(player.username)
    const email = normaliseOptionLabel(player.email)

    let label = username || email || `User ${key.slice(0, 8)}`
    if (username && email && username !== email) {
      label = `${username} (${email})`
    }

    userMap.set(key, { value: key, label })
  })

  return { campaigns, users: Array.from(userMap.values()) }
}

