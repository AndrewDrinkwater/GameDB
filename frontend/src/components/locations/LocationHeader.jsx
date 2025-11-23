import LocationFollowButton from './LocationFollowButton.jsx'

export default function LocationHeader({
  locationId,
  name,
  canEdit,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
  isMobile = false,
}) {
  const title = name || 'Untitled location'

  const handleEditClick = () => {
    if (typeof onToggleEdit === 'function') {
      onToggleEdit()
    }
  }

  const handleSaveClick = () => {
    if (typeof onSave === 'function') {
      onSave()
    }
  }

  return (
    <div className="entity-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-2" role="banner">
      <div className="entity-header-center">
        <h1 className={isMobile ? 'entity-header-title-mobile' : ''}>{title}</h1>
      </div>
      <div className="entity-header-right">
        {locationId && <LocationFollowButton locationId={locationId} />}
        {canEdit ? (
          <div className="entity-header-actions">
            {isEditing && typeof onSave === 'function' ? (
              <button
                type="button"
                className="btn submit"
                onClick={handleSaveClick}
                disabled={isSaveDisabled || isSaving}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            ) : null}
            <button
              type="button"
              className={`edit-mode-toggle ${isEditing ? 'is-active' : ''}`}
              role="switch"
              aria-checked={isEditing}
              onClick={handleEditClick}
            >
              <span className="edit-mode-toggle-track" aria-hidden="true">
                <span className="edit-mode-toggle-thumb" />
              </span>
              <span className="edit-mode-toggle-text">Edit</span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

