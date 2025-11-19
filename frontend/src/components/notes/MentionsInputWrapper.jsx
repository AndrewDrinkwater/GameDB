import { useEffect, useRef } from 'react'
import { MentionsInput } from 'react-mentions'

/**
 * Wrapper for MentionsInput that fixes the inputProps warning in React 19
 * by manually setting attributes on the textarea element via ref.
 * This prevents the library from passing inputProps directly to the DOM.
 */
export default function MentionsInputWrapper({ inputProps, ...otherProps }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || !inputProps) return

    const applyAttributes = () => {
      const textarea = containerRef.current?.querySelector('textarea')
      if (!textarea) return false

      // Apply all inputProps to the textarea element
      Object.entries(inputProps).forEach(([key, value]) => {
        if (value === null || value === undefined) return

        if (key === 'className') {
          // Merge className if it exists
          const existingClass = textarea.className || ''
          textarea.className = existingClass
            ? `${existingClass} ${value}`.trim()
            : value
        } else if (key.startsWith('data-') || key.startsWith('aria-')) {
          // Set data-* and aria-* attributes
          textarea.setAttribute(key, String(value))
        } else if (key === 'rows') {
          textarea.setAttribute('rows', String(value))
        } else if (key === 'required') {
          textarea.required = Boolean(value)
        } else if (key === 'id') {
          textarea.id = String(value)
        } else {
          // Set other standard attributes
          try {
            if (typeof value === 'boolean') {
              if (value) {
                textarea.setAttribute(key, '')
              } else {
                textarea.removeAttribute(key)
              }
            } else {
              textarea[key] = value
            }
          } catch (err) {
            // Some properties might be read-only, try setAttribute instead
            try {
              textarea.setAttribute(key, String(value))
            } catch (e) {
              // Ignore if we can't set it
            }
          }
        }
      })
      return true
    }

    // Try immediately, then with a small delay if needed
    if (!applyAttributes()) {
      const timeoutId = setTimeout(() => {
        applyAttributes()
      }, 10)

      return () => clearTimeout(timeoutId)
    }
  }, [inputProps])

  return (
    <div ref={containerRef}>
      <MentionsInput {...otherProps} />
    </div>
  )
}

