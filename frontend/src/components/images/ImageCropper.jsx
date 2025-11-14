import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

const DEFAULT_SIZE = 220
const MAX_ZOOM_MULTIPLIER = 3

export default function ImageCropper({
  src,
  size = DEFAULT_SIZE,
  onCropChange,
  className = '',
  zoomLabel = 'Zoom',
}) {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const activePointerIdRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!src) {
      setImageSize({ width: 0, height: 0 })
      return undefined
    }

    let isCancelled = false
    const img = new Image()
    img.onload = () => {
      if (isCancelled) return
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      if (isCancelled) return
      setImageSize({ width: 0, height: 0 })
    }
    img.src = src

    return () => {
      isCancelled = true
    }
  }, [src])

  const baseScale = useMemo(() => {
    if (!imageSize.width || !imageSize.height) return 1
    const widthScale = size / imageSize.width
    const heightScale = size / imageSize.height
    return Math.max(widthScale, heightScale)
  }, [imageSize, size])

  useEffect(() => {
    if (!imageSize.width || !imageSize.height) return
    setScale(baseScale)
    const displayWidth = imageSize.width * baseScale
    const displayHeight = imageSize.height * baseScale
    setOffset({
      x: (size - displayWidth) / 2,
      y: (size - displayHeight) / 2,
    })
  }, [imageSize, baseScale, size])

  const clampOffset = useCallback(
    (nextOffset, nextScale = scale) => {
      if (!imageSize.width || !imageSize.height) return nextOffset
      const displayWidth = imageSize.width * nextScale
      const displayHeight = imageSize.height * nextScale
      const minX = Math.min(0, size - displayWidth)
      const maxX = Math.max(0, size - displayWidth)
      const minY = Math.min(0, size - displayHeight)
      const maxY = Math.max(0, size - displayHeight)
      return {
        x: clamp(nextOffset.x, minX, maxX),
        y: clamp(nextOffset.y, minY, maxY),
      }
    },
    [imageSize, scale, size],
  )

  const handlePointerDown = (event) => {
    if (!src) return
    event.preventDefault()
    const target = containerRef.current
    target?.setPointerCapture?.(event.pointerId)
    activePointerIdRef.current = event.pointerId
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    setIsDragging(true)
  }

  const handlePointerMove = (event) => {
    if (!isDragging) return
    event.preventDefault()
    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    dragStartRef.current = { x: event.clientX, y: event.clientY }
    setOffset((prev) => clampOffset({ x: prev.x + deltaX, y: prev.y + deltaY }))
  }

  const endDrag = useCallback(() => {
    const target = containerRef.current
    if (activePointerIdRef.current !== null) {
      target?.releasePointerCapture?.(activePointerIdRef.current)
      activePointerIdRef.current = null
    }
    setIsDragging(false)
  }, [])

  const maxScale = baseScale * MAX_ZOOM_MULTIPLIER
  const sliderStep = Math.max(baseScale / 50, 0.01)
  const showSlider = maxScale - baseScale > 0.001

  const handleScaleChange = (event) => {
    const nextScale = clamp(Number(event.target.value), baseScale, maxScale)
    setScale(nextScale)
    setOffset((prev) => clampOffset(prev, nextScale))
  }

  useEffect(() => {
    if (typeof onCropChange !== 'function') return
    if (!imageSize.width || !imageSize.height || !src) return

    onCropChange({
      offset,
      scale,
      containerSize: size,
      naturalWidth: imageSize.width,
      naturalHeight: imageSize.height,
    })
  }, [offset, scale, size, imageSize, onCropChange, src])

  useEffect(() => {
    const target = containerRef.current
    if (!target) return undefined

    const handlePointerUp = () => endDrag()
    const handlePointerLeave = () => endDrag()

    target.addEventListener('pointerup', handlePointerUp)
    target.addEventListener('pointerleave', handlePointerLeave)
    target.addEventListener('pointercancel', handlePointerLeave)

    return () => {
      target.removeEventListener('pointerup', handlePointerUp)
      target.removeEventListener('pointerleave', handlePointerLeave)
      target.removeEventListener('pointercancel', handlePointerLeave)
    }
  }, [endDrag])

  const displayWidth = imageSize.width * scale
  const displayHeight = imageSize.height * scale

  return (
    <div className={`image-cropper ${className}`.trim()}>
      <div
        className={`image-cropper__frame${isDragging ? ' is-dragging' : ''}`}
        ref={containerRef}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        role="presentation"
      >
        {src ? (
          <img
            src={src}
            alt="Selected artwork preview"
            draggable={false}
            style={{
              width: displayWidth,
              height: displayHeight,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        ) : (
          <div className="image-cropper__empty">Unable to preview image</div>
        )}
        <div className="image-cropper__outline" aria-hidden="true" />
        <div className="image-cropper__instructions" aria-hidden="true">
          Drag to reposition
        </div>
      </div>
      {showSlider ? (
        <label className="image-cropper__zoom">
          <span>{zoomLabel}</span>
          <input
            type="range"
            min={baseScale}
            max={maxScale}
            step={sliderStep}
            value={scale}
            onChange={handleScaleChange}
          />
        </label>
      ) : (
        <p className="image-cropper__zoom image-cropper__zoom--disabled">
          Zoom unavailable for this image
        </p>
      )}
    </div>
  )
}
