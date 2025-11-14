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
  featuredImageSrc,
  renderSchemaSections,
  imageSection,
}) {
  const sections = Array.isArray(dossierSchema?.sections)
    ? dossierSchema.sections
    : []
  const summarySection = sections[0] || null
  const descriptionSection = sections[1] || null
  const remainingSections = sections.slice(2)

  const renderSectionFields = (section, keyPrefix) => {
    if (!section) return null
    const columnCount = Number.isFinite(section.columns)
      ? Math.max(1, Number(section.columns))
      : 1
    const fields = Array.isArray(section.fields) ? section.fields : []

    if (!fields.length) {
      return <p className="entity-empty-state">No fields available.</p>
    }

    return (
      <div
        className="entity-field-grid"
        style={{ '--entity-field-columns': columnCount }}
      >
        {fields.map((field, index) => {
          const fieldKey =
            field?.key || field?.name || field?.field || `${keyPrefix}-${index}`
          return (
            <FieldRenderer
              key={`${keyPrefix}-${fieldKey}`}
              field={{ ...field }}
              data={viewData}
              mode="view"
            />
          )
        })}
      </div>
    )
  }

  const showFeaturedImage = Boolean(featuredImageSrc) && !isEditing
  const entityName = viewData?.name || 'Entity'

  const renderViewContent = () => {
    if (!showFeaturedImage) {
      return renderSchemaSections(dossierSchema, viewData, 'dossier')
    }

    const remainingSchema = {
      ...(dossierSchema || {}),
      sections: remainingSections,
    }

    return (
      <>
        <section className="entity-card entity-dossier-header-card">
          <div className="entity-dossier-header">
            <div className="entity-dossier-header-content">
              {summarySection?.title ? (
                <h2 className="entity-card-title">{summarySection.title}</h2>
              ) : null}
              {renderSectionFields(summarySection, 'dossier-summary')}
              {descriptionSection ? (
                <div className="entity-dossier-description">
                  {descriptionSection?.title ? (
                    <h3 className="entity-card-subtitle">
                      {descriptionSection.title}
                    </h3>
                  ) : null}
                  {renderSectionFields(descriptionSection, 'dossier-description')}
                </div>
              ) : null}
            </div>
            <div className="entity-dossier-header-image">
              <img src={featuredImageSrc} alt={`${entityName} artwork`} loading="lazy" />
            </div>
          </div>
        </section>
        {renderSchemaSections(remainingSchema, viewData, 'dossier')}
      </>
    )
  }

  return (
    <div className="entity-tab-content">
      {imageSection || null}
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
        renderViewContent()
      )}
    </div>
  )
}
