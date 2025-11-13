import { useBlocker } from 'react-router-dom'

/**
 * Thin wrapper around React Router's useBlocker hook so existing pages can
 * keep using the previous API shape.
 */
export default function useNavigationBlocker(shouldBlockNavigation) {
  return useBlocker(
    typeof shouldBlockNavigation === 'function' ? shouldBlockNavigation : false,
  )
}
