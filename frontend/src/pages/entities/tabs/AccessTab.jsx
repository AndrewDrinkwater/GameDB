import ListCollector from '../../../components/ListCollector.jsx'

const ACCESS_MODE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'selective', label: 'Selective' },
  { value: 'hidden', label: 'Hidden' },
]

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
  isAccessDirty,
  handleAccessSettingChange,
  handleAccessSave,
}) {
  return (
    <div className="entity-tab-content">
      <section className="entity-card entity-access-card">
        <h2 className="entity-card-title">Access controls</h2>
        <p className="entity-access-note help-text">
          Configure who can view and edit this entity. Users with write access will
          automatically receive read access. Save your changes to update the access rules.
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
            <div className="entity-access-columns">
              {/* READ ACCESS */}
              <div className="entity-access-column">
                <h3>Read access</h3>
                <div className="form-group">
                  <label htmlFor="entity-access-read-mode">Visibility</label>
                  <select
                    id="entity-access-read-mode"
                    value={accessSettings.readMode}
                    onChange={(e) =>
                      handleAccessSettingChange('readMode', e.target.value)
                    }
                    disabled={!canEdit || accessSaving}
                  >
                    {ACCESS_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {accessSettings.readMode === 'selective' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="entity-access-read-campaigns">Campaigns</label>
                      <ListCollector
                        inputId="entity-access-read-campaigns"
                        selected={accessSettings.readCampaigns}
                        options={accessOptions.campaigns}
                        onChange={(v) =>
                          handleAccessSettingChange('readCampaigns', v)
                        }
                        placeholder="Select campaigns..."
                        noOptionsMessage={
                          accessOptionsLoading
                            ? 'Loading campaigns...'
                            : 'No campaigns available for this world.'
                        }
                        loading={accessOptionsLoading}
                        disabled={!canEdit || accessSaving}
                      />
                      <p className="help-text">
                        Members of selected campaigns can view this entity.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="entity-access-read-users">Users</label>
                      <ListCollector
                        inputId="entity-access-read-users"
                        selected={accessSettings.readUsers}
                        options={accessOptions.users}
                        onChange={(v) =>
                          handleAccessSettingChange('readUsers', v)
                        }
                        placeholder="Select users..."
                        noOptionsMessage={
                          accessOptionsLoading
                            ? 'Loading users...'
                            : 'No eligible users found for this world.'
                        }
                        loading={accessOptionsLoading}
                        disabled={!canEdit || accessSaving}
                      />
                      <p className="help-text">
                        Choose players who have characters in this world.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* WRITE ACCESS */}
              <div className="entity-access-column">
                <h3>Write access</h3>
                <div className="form-group">
                  <label htmlFor="entity-access-write-mode">Write</label>
                  <select
                    id="entity-access-write-mode"
                    value={accessSettings.writeMode}
                    onChange={(e) =>
                      handleAccessSettingChange('writeMode', e.target.value)
                    }
                    disabled={!canEdit || accessSaving}
                  >
                    {ACCESS_MODE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {accessSettings.writeMode === 'selective' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="entity-access-write-campaigns">Campaigns</label>
                      <ListCollector
                        inputId="entity-access-write-campaigns"
                        selected={accessSettings.writeCampaigns}
                        options={accessOptions.campaigns}
                        onChange={(v) =>
                          handleAccessSettingChange('writeCampaigns', v)
                        }
                        placeholder="Select campaigns..."
                        noOptionsMessage={
                          accessOptionsLoading
                            ? 'Loading campaigns...'
                            : 'No campaigns available for this world.'
                        }
                        loading={accessOptionsLoading}
                        disabled={!canEdit || accessSaving}
                      />
                      <p className="help-text">
                        Dungeon Masters of these campaigns can edit this entity.
                      </p>
                    </div>

                    <div className="form-group">
                      <label htmlFor="entity-access-write-users">Users</label>
                      <ListCollector
                        inputId="entity-access-write-users"
                        selected={accessSettings.writeUsers}
                        options={accessOptions.users}
                        onChange={(v) =>
                          handleAccessSettingChange('writeUsers', v)
                        }
                        placeholder="Select users..."
                        noOptionsMessage={
                          accessOptionsLoading
                            ? 'Loading users...'
                            : 'No eligible users found for this world.'
                        }
                        loading={accessOptionsLoading}
                        disabled={!canEdit || accessSaving}
                      />
                      <p className="help-text">
                        Grant edit access to specific players with characters here.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

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
              <button
                type="button"
                className="btn submit"
                onClick={handleAccessSave}
                disabled={!canEdit || accessSaving || !isAccessDirty}
              >
                {accessSaving ? 'Saving...' : 'Save access settings'}
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
