import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

const BODY_LOCK_CLASS = 'drawer-panel-open'

const createContainer = () => {
  const element = document.createElement('div')
  element.className = 'drawer-portal-container'
  return element
}

export default function DrawerPanel({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  labelledBy,
  closeLabel = 'Close panel',
}) {
  const containerRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const panelId = useMemo(() => labelledBy || `drawer-${Math.random().toString(36).slice(2)}`, [labelledBy])

  useEffect(() => {
    if (!containerRef.current) {
      containerRef.current = createContainer()
      document.body.appendChild(containerRef.current)
    }

    return () => {
      if (containerRef.current && containerRef.current.parentNode) {
        containerRef.current.parentNode.removeChild(containerRef.current)
      }
      containerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.classList.add(BODY_LOCK_CLASS)

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }

    const handleFocusIn = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        const focusTarget =
          containerRef.current?.querySelector('[data-autofocus]') ||
          containerRef.current?.querySelector('.drawer-panel')
        if (focusTarget instanceof HTMLElement) {
          focusTarget.focus({ preventScroll: true })
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.body.classList.remove(BODY_LOCK_CLASS)
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus({ preventScroll: true })
      }
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      const autoFocusTarget = containerRef.current?.querySelector('[data-autofocus]')
      if (autoFocusTarget instanceof HTMLElement) {
        autoFocusTarget.focus({ preventScroll: true })
      }
    }, 20)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!isOpen || !containerRef.current) {
    return null
  }

  return createPortal(
    <div className="drawer-panel-wrapper" role="presentation">
      <div className="drawer-panel-overlay" onClick={onClose} />
      <aside
        className={`drawer-panel drawer-panel--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={panelId}
        tabIndex={-1}
      >
        <div className="drawer-panel-header">
          <div className="drawer-panel-heading">
            <h2 id={panelId}>{title}</h2>
            {description ? <p className="drawer-panel-description">{description}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </div>
        <div className="drawer-panel-body" tabIndex={-1} data-autofocus>
          {children}
        </div>
        {footer ? <div className="drawer-panel-footer">{footer}</div> : null}
      </aside>
    </div>,
    containerRef.current,
  )
}
