import { useMemo } from 'react'
import { IDLE_BLOCKER, useBlocker } from 'react-router-dom'

export default function useNavigationBlocker(shouldBlockNavigation) {
  const predicate = useMemo(() => {
    if (typeof shouldBlockNavigation === 'function') {
      return shouldBlockNavigation
    }
    return () => false
  }, [shouldBlockNavigation])

  const blocker = useBlocker(predicate)

  return blocker || IDLE_BLOCKER
}
