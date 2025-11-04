import FormRenderer from '../../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../../components/RecordForm/FieldRenderer.jsx'

export default function DossierTab({
  isEditing,
  canEdit,
  formError,
  formRef,
  editSchema,
  editInitialData,
  handleUpdate,
  handleFormStateChange,
  dossierSchema,
  viewData,
  renderSchemaSections,
}) {
  return (
    <div className="entity-tab-content">
      {formError && (
        <section className="entity-card">
          <div className="alert error" role="alert">
            {formError}
          </div>
        </section>
      )}

      {isEditing && canEdit ? (
        <section className="entity-card entity-card--form">
          <FormRenderer
            ref={formRef}
            schema={editSchema}
            initialData={editInitialData || {}}
            onSubmit={handleUpdate}
            onStateChange={handleFormStateChange}
            hideActions
            enableUnsavedPrompt={false}
          />
        </section>
      ) : (
        renderSchemaSections(dossierSchema, viewData, 'dossier')
      )}
    </div>
  )
}
