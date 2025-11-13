import AccessSettingsEditor from '../../../components/entities/AccessSettingsEditor.jsx'

export default function AccessTab({
  canEdit,
  worldId,
  accessSettings,
  accessOptions,
  accessOptionsError,
  accessOptionsLoading,
  accessSaving,
  accessSaveError,
  accessSaveSuccess,
  handleAccessSettingChange,
}) {
  return (
    <div className="entity-tab-content">
      <section className="entity-card entity-access-card">
        <h2 className="entity-card-title">Access controls</h2>
        <p className="entity-access-note help-text">
          Configure who can view and edit this entity. Users with write access will
          automatically receive read access. Changes are saved along with the rest of the
          record.
        </p>

        {accessOptionsError && (
          <div className="alert error" role="alert">
            {accessOptionsError}
          </div>
        )}

        {!worldId ? (
          <p className="entity-empty-state">
            Assign this entity to a world to configure access settings.
          </p>
        ) : (
          <>
            <AccessSettingsEditor
              canEdit={canEdit}
              accessSettings={accessSettings}
              accessOptions={accessOptions}
              accessOptionsLoading={accessOptionsLoading}
              accessSaving={accessSaving}
              onSettingChange={handleAccessSettingChange}
            />

            <div className="entity-access-actions">
              {accessSaveError && (
                <div className="alert error" role="alert">
                  {accessSaveError}
                </div>
              )}
              {accessSaveSuccess && (
                <div className="alert success" role="status">
                  {accessSaveSuccess}
                </div>
              )}
              <p className="help-text">
                Use the main Save action to apply your access changes.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
