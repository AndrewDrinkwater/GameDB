import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { UNSAFE_NavigationContext, useLocation } from 'react-router-dom'

const INITIAL_BLOCKER_STATE = {
  state: 'unblocked',
  location: null,
  proceed: undefined,
  reset: undefined,
}

export default function useNavigationBlocker(shouldBlockNavigation) {
  const navigationContext = useContext(UNSAFE_NavigationContext)
  const currentLocation = useLocation()
  const blockerPredicate =
    typeof shouldBlockNavigation === 'function' ? shouldBlockNavigation : null
  const transitionRef = useRef(null)
  const [blockerState, setBlockerState] = useState(INITIAL_BLOCKER_STATE)

  useEffect(() => {
    if (!blockerPredicate || !navigationContext?.navigator?.block) {
      transitionRef.current = null
      setBlockerState(INITIAL_BLOCKER_STATE)
      return undefined
    }

    const navigator = navigationContext.navigator

    const unblock = navigator.block((tx) => {
      const shouldBlock = blockerPredicate({
        currentLocation,
        nextLocation: tx.location,
        historyAction: tx.historyAction,
      })

      if (!shouldBlock) {
        unblock()
        tx.retry()
        return
      }

      const autoUnblockingTx = {
        ...tx,
        retry() {
          unblock()
          tx.retry()
        },
      }

      transitionRef.current = autoUnblockingTx
      setBlockerState((prev) => ({
        ...prev,
        state: 'blocked',
        location: tx.location,
      }))
    })

    return () => {
      unblock()
      transitionRef.current = null
      setBlockerState(INITIAL_BLOCKER_STATE)
    }
  }, [blockerPredicate, navigationContext, currentLocation])

  const proceed = useCallback(() => {
    if (!transitionRef.current) return
    setBlockerState((prev) => ({
      ...prev,
      state: 'proceeding',
    }))
    transitionRef.current.retry()
    transitionRef.current = null
  }, [])

  const reset = useCallback(() => {
    transitionRef.current = null
    setBlockerState((prev) => ({
      ...prev,
      state: 'unblocked',
      location: null,
    }))
  }, [])

  return {
    state: blockerState.state,
    location: blockerState.location,
    proceed,
    reset,
  }
}
