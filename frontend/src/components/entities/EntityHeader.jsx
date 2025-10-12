export default function EntityHeader({
  name,
  onBack,
  canEdit,
  isEditing,
  onToggleEdit,
}) {
  const title = name || 'Untitled entity'

  const handleBackClick = () => {
    if (typeof onBack === 'function') {
      onBack()
    }
  }

  const handleEditClick = () => {
    if (typeof onToggleEdit === 'function') {
      onToggleEdit()
    }
  }

  return (
    <div className="entity-header" role="banner">
      <div className="entity-header-left">
        <button type="button" className="btn secondary" onClick={handleBackClick}>
          Back to entities
        </button>
      </div>
      <div className="entity-header-center">
        <h1>{title}</h1>
      </div>
      <div className="entity-header-right">
        {canEdit ? (
          <button
            type="button"
            className={`btn ${isEditing ? 'cancel' : 'submit'}`}
            onClick={handleEditClick}
          >
            {isEditing ? 'Cancel editing' : 'Edit entity'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
