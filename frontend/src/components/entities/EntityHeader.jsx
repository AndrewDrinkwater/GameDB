export default function EntityHeader({
  name,
  canEdit,
  isEditing,
  onToggleEdit,
  onSave,
  isSaving = false,
  isSaveDisabled = false,
}) {
  const title = name || 'Untitled entity'

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
      <div className="entity-header-center">
        <h1>{title}</h1>
      </div>
      {canEdit ? (
        <div className="entity-header-right">
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
        </div>
      ) : null}
    </div>
  )
}
