import FormRenderer from '../../../components/RecordForm/FormRenderer.jsx'
import FieldRenderer from '../../../components/RecordForm/FieldRenderer.jsx'
import { isFieldHiddenByRules } from '../../../utils/fieldRuleEngine.js'

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
  fieldRules,
  viewRuleContext,
}) {
  const sections = Array.isArray(dossierSchema?.sections)
    ? dossierSchema.sections
    : []
  const summarySection = sections[0] || null
  const descriptionSection = sections[1] || null
  const remainingSections = sections.slice(2)

  const actionsByField = viewRuleContext?.actionsByField ?? {}
  const showRuleTargets = viewRuleContext?.showRuleTargets ?? new Set()

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
        className={`entity-field-grid ${columnCount > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}`}
        style={{ '--entity-field-columns': columnCount }}
      >
        {fields.map((field, index) => {
          const fieldKey =
            field?.key || field?.name || field?.field || `${keyPrefix}-${index}`

          const action = actionsByField[fieldKey]
          const defaultVisible =
            field.visibleByDefault !== undefined
              ? Boolean(field.visibleByDefault)
              : field.visible_by_default !== undefined
                ? Boolean(field.visible_by_default)
                : true

          if (
            isFieldHiddenByRules(
              fieldKey,
              action,
              showRuleTargets,
              defaultVisible,
            )
          ) {
            return null
          }
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
  const showImageManager = Boolean(imageSection) && isEditing && canEdit

  const renderViewContent = () => {
    if (!showFeaturedImage) {
      return renderSchemaSections(
        dossierSchema,
        viewData,
        'dossier',
        viewRuleContext,
      )
    }

    const remainingSchema = {
      ...(dossierSchema || {}),
      sections: remainingSections,
    }

    return (
      <>
        <section className="entity-card entity-dossier-header-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          <div className="entity-dossier-header">
            <div className="entity-dossier-header-content">
              {summarySection?.title ? (
                <h2 className="entity-card-title">{summarySection.title}</h2>
              ) : null}
              {renderSectionFields(summarySection, 'dossier-summary')}
              {descriptionSection ? (
                <div className="entity-dossier-description">
                  {renderSectionFields(descriptionSection, 'dossier-description')}
                </div>
              ) : null}
            </div>
            <div className="entity-dossier-header-image sm:ml-6 sm:w-64 w-full mt-4 sm:mt-0">
              <img src={featuredImageSrc} alt={`${entityName} artwork`} loading="lazy" />
            </div>
          </div>
        </section>
        {renderSchemaSections(
          remainingSchema,
          viewData,
          'dossier',
          viewRuleContext,
        )}
      </>
    )
  }

  return (
    <div className="entity-tab-content">
      {formError && (
        <section className="entity-card bg-white rounded-lg border p-4 sm:p-6 w-full">
          <div className="alert error" role="alert">
            {formError}
          </div>
        </section>
      )}

      {isEditing && canEdit ? (
        <section className="entity-card entity-card--form entity-edit-form-wrapper bg-white rounded-lg border p-4 sm:p-6 w-full">
          <div className="entity-edit-form-container">
            <div className="entity-edit-form-content">
              <FormRenderer
                ref={formRef}
                schema={editSchema}
                initialData={editInitialData || {}}
                onSubmit={handleUpdate}
                onStateChange={handleFormStateChange}
                hideActions
                enableUnsavedPrompt={false}
                fieldRules={fieldRules}
              />
            </div>
            {showImageManager ? (
              <div className="entity-edit-form-image sm:ml-6 sm:w-64 w-full mt-4 sm:mt-0">
                {imageSection}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        renderViewContent()
      )}
    </div>
  )
}
