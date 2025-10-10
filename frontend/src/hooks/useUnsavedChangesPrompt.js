import { useCallback } from 'react'
import { unstable_usePrompt, useBeforeUnload } from 'react-router-dom'

export const UNSAVED_CHANGES_MESSAGE =
  'You have unsaved changes. Select Cancel to stay here and save, or OK to leave without saving.'

export default function useUnsavedChangesPrompt(
  isDirty,
  message = UNSAVED_CHANGES_MESSAGE,
  bypassRef,
) {
  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (!isDirty) return false
      if (bypassRef?.current) return false

      const isSameDestination =
        currentLocation.pathname === nextLocation.pathname &&
        currentLocation.search === nextLocation.search &&
        currentLocation.hash === nextLocation.hash

      return !isSameDestination
    },
    [isDirty, bypassRef],
  )

  unstable_usePrompt({
    when: shouldBlockNavigation,
    message,
  })

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!isDirty || bypassRef?.current) return

        event.preventDefault()
        event.returnValue = ''
      },
      [isDirty, bypassRef],
    ),
    { capture: true },
  )
}
