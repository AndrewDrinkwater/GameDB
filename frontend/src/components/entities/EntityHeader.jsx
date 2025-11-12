export default function EntityHeader({
  name,
  onBack,
  onExplore,
  canEdit,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
}) {
  const title = name || 'Untitled entity'

  const handleBackClick = () => {
    if (typeof onBack === 'function') {
      onBack()
    }
  }

  const handleExploreClick = () => {
    if (typeof onExplore === 'function') {
      onExplore()
    }
  }

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
    <div className="entity-header" role="banner">
      <div className="entity-header-left">
        <button type="button" className="btn secondary" onClick={handleBackClick}>
          Back to entities
        </button>
        {typeof onExplore === 'function' ? (
          <button type="button" className="btn secondary" onClick={handleExploreClick}>
            Explore
          </button>
        ) : null}
      </div>
      <div className="entity-header-center">
        <h1>{title}</h1>
      </div>
      <div className="entity-header-right">
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
