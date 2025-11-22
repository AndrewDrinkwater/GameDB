import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import PropTypes from '../../utils/propTypes.js'
import { fetchLocationById } from '../../api/locations.js'
import { getLocationTypeFields } from '../../api/locationTypeFields.js'
import { extractListResponse } from '../../utils/apiUtils.js'
import LocationInfoDrawer from './LocationInfoDrawer.jsx'

export default function LocationInfoPreview({ locationId, locationName = 'location', className = '' }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewLocation, setPreviewLocation] = useState(null)
  const [error, setError] = useState('')
  const [locationFields, setLocationFields] = useState([])
  const portalContainerRef = useRef(null)
  const drawerLocationId = useMemo(() => {
    if (locationId === null || locationId === undefined) return null
    return String(locationId)
  }, [locationId])

  // Create portal container for drawer to ensure it's positioned relative to viewport
  useEffect(() => {
    if (!portalContainerRef.current) {
      portalContainerRef.current = document.createElement('div')
      document.body.appendChild(portalContainerRef.current)
    }
    return () => {
      if (portalContainerRef.current && portalContainerRef.current.parentNode) {
        portalContainerRef.current.parentNode.removeChild(portalContainerRef.current)
        portalContainerRef.current = null
      }
    }
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setError('')
    setPreviewLocation(null)
    setLoading(false)
  }, [])

  const handleTriggerClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (locationId === null || locationId === undefined) return
    const fallbackLabel = typeof locationName === 'string' ? locationName.trim() : ''
    if (drawerLocationId && fallbackLabel) {
      setPreviewLocation((prev) => {
        if (prev && prev.id === drawerLocationId) {
          if (prev.name || !fallbackLabel) {
            return prev
          }
          return { ...prev, name: fallbackLabel }
        }
        return { id: drawerLocationId, name: fallbackLabel }
      })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!drawerLocationId) return
    const fallbackLabel = typeof locationName === 'string' ? locationName.trim() : ''
    if (!fallbackLabel) return
    setPreviewLocation((prev) => {
      if (!prev) return prev
      if (prev.id !== drawerLocationId) return prev
      if (prev.name === fallbackLabel) return prev
      if (prev.name && prev.name !== fallbackLabel) return prev
      return { ...prev, name: fallbackLabel }
    })
  }, [drawerLocationId, locationName])

  useEffect(() => {
    if (!open || !drawerLocationId) return undefined
    let cancelled = false

    const loadLocation = async () => {
      setLoading(true)
      setError('')
      try {
        const response = await fetchLocationById(drawerLocationId)
        if (cancelled) return
        const data = response?.data || response
        if (!data) {
          setPreviewLocation(null)
          setError('Location not found')
          return
        }
        setPreviewLocation(data)
      } catch (err) {
        if (cancelled) return
        console.error('❌ Failed to load location preview', err)
        setPreviewLocation(null)
        setError(err.message || 'Failed to load location information')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadLocation()

    return () => {
      cancelled = true
    }
  }, [open, drawerLocationId])

  const previewLocationTypeId = useMemo(() => {
    if (!previewLocation) return null
    return (
      previewLocation.location_type_id ||
      previewLocation.locationType?.id ||
      previewLocation.location_type?.id ||
      null
    )
  }, [previewLocation])

  useEffect(() => {
    if (!previewLocationTypeId) {
      setLocationFields([])
      return undefined
    }

    if (!open) {
      return undefined
    }

    let cancelled = false

    const loadLocationFields = async () => {
      try {
        const response = await getLocationTypeFields(previewLocationTypeId).catch((err) => {
          console.error('⚠️ Failed to load preview location fields', err)
          return null
        })

        if (cancelled) return

        const fields = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
        setLocationFields(fields)
      } catch (err) {
        if (cancelled) return
        console.error('❌ Failed to load preview location fields', err)
        setLocationFields([])
      }
    }

    loadLocationFields()

    return () => {
      cancelled = true
    }
  }, [open, previewLocationTypeId])

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleClose])

  const drawerContent = open && portalContainerRef.current ? (
    <LocationInfoDrawer
      locationId={drawerLocationId}
      location={previewLocation}
      isLoading={loading}
      error={error}
      fallbackName={locationName}
      locationFields={locationFields}
      onClose={handleClose}
    />
  ) : null

  return (
    <>
      <button
        type="button"
        className={`location-info-trigger ${className}`.trim()}
        onClick={handleTriggerClick}
        aria-label={`View details for ${locationName}`}
      >
        <Info size={16} aria-hidden="true" />
      </button>
      {portalContainerRef.current && createPortal(drawerContent, portalContainerRef.current)}
    </>
  )
}

LocationInfoPreview.propTypes = {
  locationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  locationName: PropTypes.string,
  className: PropTypes.string,
}

