import { useEffect, useState } from 'react'

const DEFAULT_BREAKPOINT = 768

export default function useIsMobile(maxWidth = DEFAULT_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${maxWidth}px)`).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const mediaQuery = window.matchMedia(`(max-width: ${maxWidth}px)`)

    const handleChange = (event) => {
      setIsMobile(event.matches)
    }

    // Ensure state stays in sync if maxWidth changes dynamically
    setIsMobile(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [maxWidth])

  return isMobile
}
