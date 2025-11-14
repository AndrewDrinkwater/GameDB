import { useCallback, useEffect, useState } from 'react'
import { useBlocker, useBeforeUnload } from 'react-router-dom'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog.jsx'

export default function useUnsavedChangesPrompt(shouldBlock, bypassRef) {
  const [showDialog, setShowDialog] = useState(false)
  const [activeBlocker, setActiveBlocker] = useState(null)

  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) => {
      if (!shouldBlock || bypassRef?.current) return false
      if (!nextLocation) return false

      const isSameDestination =
        currentLocation.pathname === nextLocation.pathname &&
        currentLocation.search === nextLocation.search &&
        currentLocation.hash === nextLocation.hash

      return !isSameDestination
    },
    [shouldBlock, bypassRef],
  )

  const blocker = useBlocker(shouldBlockNavigation)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setActiveBlocker(blocker)
      setShowDialog(true)
    } else if (blocker.state === 'idle') {
      setActiveBlocker(null)
      setShowDialog(false)
    }
  }, [blocker])

  useEffect(() => {
    if (!shouldBlock) {
      setShowDialog(false)
      setActiveBlocker(null)
    }
  }, [shouldBlock])

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!shouldBlock || bypassRef?.current) return
        event.preventDefault()
        event.returnValue = ''
      },
      [shouldBlock, bypassRef],
    ),
    { capture: true },
  )

  const handleClose = useCallback(() => {
    setShowDialog(false)
    activeBlocker?.reset?.()
    setActiveBlocker(null)
  }, [activeBlocker])

  const dialog = showDialog ? (
    <UnsavedChangesDialog
      open={true}
      onClose={handleClose}
      onAction={(action) => {
        if (action === 'discard') {
          setShowDialog(false)
          activeBlocker?.proceed?.()
          setActiveBlocker(null)
        } else if (action === 'save') {
          setShowDialog(false)
        }
      }}
    />
  ) : null

  return dialog
}
