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
        className="entity-field-grid"
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
        {renderSchemaSections(
          remainingSchema,
          viewData,
          'dossier',
          viewRuleContext,
        )}
      </>
    )
  }

  const renderEditSummary = () => {
    if (!isEditing || !canEdit) return null
    if (!summarySection && !showImageManager) return null

    return (
      <section className="entity-card entity-dossier-header-card entity-dossier-header-card--editing">
        <div className="entity-dossier-header entity-dossier-header--editing">
          <div className="entity-dossier-header-content">
            {summarySection?.title ? (
              <h2 className="entity-card-title">{summarySection.title}</h2>
            ) : null}
            {summarySection ? (
              renderSectionFields(summarySection, 'dossier-summary-edit')
            ) : (
              <p className="entity-empty-state">Summary details are unavailable.</p>
            )}
          </div>
          {showImageManager ? (
            <div className="entity-dossier-header-image entity-dossier-header-image--manager">
              {imageSection}
            </div>
          ) : null}
        </div>
      </section>
    )
  }

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
        <>
          {renderEditSummary()}
          <section className="entity-card entity-card--form">
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
          </section>
        </>
      ) : (
        renderViewContent()
      )}
    </div>
  )
}
