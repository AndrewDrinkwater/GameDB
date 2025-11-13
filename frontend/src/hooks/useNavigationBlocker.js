import { useContext, useEffect, useState } from 'react'
import { UNSAFE_NavigationContext, useLocation } from 'react-router-dom'

/**
 * Provides a minimal replacement for the removed unstable_useBlocker API.
 * The hook mimics the object signature returned by unstable_useBlocker so the
 * existing EntityDetailPage logic can stay untouched.
 */
export default function useNavigationBlocker(shouldBlockNavigation) {
  const { navigator } = useContext(UNSAFE_NavigationContext)
  const location = useLocation()
  const [blockerState, setBlockerState] = useState({ state: 'unblocked' })

  useEffect(() => {
    if (!navigator?.block || typeof shouldBlockNavigation !== 'function') {
      return undefined
    }

    const unblock = navigator.block((tx) => {
      const shouldBlock = shouldBlockNavigation({
        currentLocation: location,
        nextLocation: tx.location,
      })

      if (!shouldBlock) {
        unblock()
        tx.retry()
        return
      }

      setBlockerState({
        state: 'blocked',
        location: tx.location,
        proceed: () => {
          setBlockerState({ state: 'proceeding', location: tx.location })
          unblock()
          tx.retry()
        },
        reset: () => {
          setBlockerState({ state: 'unblocked' })
        },
      })
    })

    return () => {
      unblock()
    }
  }, [navigator, location, shouldBlockNavigation])

  return blockerState
}
