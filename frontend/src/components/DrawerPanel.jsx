import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const BODY_LOCK_CLASS = 'drawer-panel-open'
const ANIMATION_DURATION = 300
const SIZE_WIDTHS = {
  sm: '360px',
  md: '420px',
  lg: '560px',
}

const focusableSelectors = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
]

const createContainer = () => {
  const element = document.createElement('div')
  element.className = 'drawer-portal-container'
  return element
}

const normaliseWidth = (width, size) => {
  if (width) {
    return typeof width === 'number' ? `${width}px` : String(width)
  }
  if (size && SIZE_WIDTHS[size]) {
    return SIZE_WIDTHS[size]
  }
  return SIZE_WIDTHS.md
}

export default function DrawerPanel({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  footerActions,
  width,
  size = 'md',
  labelledBy,
  closeLabel = 'Close panel',
  className = '',
  mobileFull = true,
}) {
  const containerRef = useRef(null)
  const panelRef = useRef(null)
  const previouslyFocusedRef = useRef(null)
  const closeTimerRef = useRef(null)
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)
  const panelId = useMemo(
    () => labelledBy || `drawer-${Math.random().toString(36).slice(2)}`,
    [labelledBy],
  )
  const descriptionId = description ? `${panelId}-description` : undefined
  const resolvedWidth = normaliseWidth(width, size)

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
    if (isOpen) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      setShouldRender(true)
      setIsClosing(false)
      return () => {}
    }

    if (!shouldRender) {
      return () => {}
    }

    setIsClosing(true)
    closeTimerRef.current = setTimeout(() => {
      setShouldRender(false)
      setIsClosing(false)
      closeTimerRef.current = null
    }, ANIMATION_DURATION)

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
    }
  }, [isOpen, shouldRender])

  useEffect(() => {
    if (!isOpen) return undefined

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.body.classList.add(BODY_LOCK_CLASS)

    const getFocusable = () => {
      if (!panelRef.current) return []
      return Array.from(panelRef.current.querySelectorAll(focusableSelectors.join(','))).filter(
        (element) => element instanceof HTMLElement && element.offsetParent !== null,
      )
    }

    const focusFirstElement = () => {
      const focusables = getFocusable()
      const first = focusables[0]
      if (first) {
        first.focus({ preventScroll: true })
      } else if (panelRef.current) {
        panelRef.current.focus({ preventScroll: true })
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }

      if (event.key !== 'Tab') return

      const focusables = getFocusable()
      if (focusables.length === 0) {
        event.preventDefault()
        panelRef.current?.focus({ preventScroll: true })
        return
      }

      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement

      if (event.shiftKey) {
        if (active === first || !panelRef.current?.contains(active)) {
          event.preventDefault()
          last.focus({ preventScroll: true })
        }
        return
      }

      if (active === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    const handleFocusIn = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        focusFirstElement()
      }
    }

    const autoFocusTimer = setTimeout(() => {
      if (!panelRef.current) return
      const explicitTarget = panelRef.current.querySelector('[data-autofocus]')
      if (explicitTarget instanceof HTMLElement) {
        explicitTarget.focus({ preventScroll: true })
        return
      }
      focusFirstElement()
    }, 20)

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)

    return () => {
      clearTimeout(autoFocusTimer)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      document.body.classList.remove(BODY_LOCK_CLASS)
      if (previouslyFocusedRef.current instanceof HTMLElement) {
        previouslyFocusedRef.current.focus({ preventScroll: true })
      }
    }
  }, [isOpen, onClose])

  if (!shouldRender || !containerRef.current) {
    return null
  }

  const wrapperClassNames = [
    'drawer-panel-wrapper',
    isOpen ? 'drawer-panel-wrapper--open' : '',
    isClosing ? 'drawer-panel-wrapper--closing' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const panelClassNames = [
    'drawer-panel',
    size ? `drawer-panel--${size}` : '',
    mobileFull ? 'drawer-panel--mobile-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const footerContent = footerActions ?? footer

  return createPortal(
    <div className={wrapperClassNames} role="presentation">
      <div className="drawer-panel-overlay" onClick={onClose} role="presentation" />
      <aside
        ref={panelRef}
        className={panelClassNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={panelId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        style={{ '--drawer-panel-width': resolvedWidth }}
      >
        <div className="drawer-panel-header">
          <div className="drawer-panel-heading">
            <h2 id={panelId}>{title}</h2>
            {description ? (
              <p id={descriptionId} className="drawer-panel-description">
                {description}
              </p>
            ) : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={closeLabel}>
            ×
          </button>
        </div>
        <div className="drawer-panel-body">{children}</div>
        {footerContent ? <div className="drawer-panel-footer">{footerContent}</div> : null}
      </aside>
    </div>,
    containerRef.current,
  )
}
