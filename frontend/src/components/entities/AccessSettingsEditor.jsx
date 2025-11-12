import ListCollector from '../ListCollector.jsx'

const ACCESS_MODE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'selective', label: 'Selective' },
  { value: 'hidden', label: 'Hidden' },
]

const buildFieldId = (prefix, key) => `${prefix}-${key}`

export default function AccessSettingsEditor({
  canEdit,
  accessSettings,
  accessOptions,
  accessOptionsLoading,
  accessSaving,
  onSettingChange,
  idPrefix = 'entity-access',
}) {
  const disabled = !canEdit || accessSaving

  const readModeId = buildFieldId(idPrefix, 'read-mode')
  const readCampaignsId = buildFieldId(idPrefix, 'read-campaigns')
  const readUsersId = buildFieldId(idPrefix, 'read-users')
  const writeModeId = buildFieldId(idPrefix, 'write-mode')
  const writeCampaignsId = buildFieldId(idPrefix, 'write-campaigns')
  const writeUsersId = buildFieldId(idPrefix, 'write-users')

  return (
    <div className="entity-access-columns">
      <div className="entity-access-column">
        <h3>Read access</h3>
        <div className="form-group">
          <label htmlFor={readModeId}>Visibility</label>
          <select
            id={readModeId}
            value={accessSettings.readMode}
            onChange={(event) => onSettingChange('readMode', event.target.value)}
            disabled={disabled}
          >
            {ACCESS_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {accessSettings.readMode === 'selective' && (
          <>
            <div className="form-group">
              <label htmlFor={readCampaignsId}>Campaigns</label>
              <ListCollector
                inputId={readCampaignsId}
                selected={accessSettings.readCampaigns}
                options={accessOptions.campaigns}
                onChange={(value) => onSettingChange('readCampaigns', value)}
                placeholder="Select campaigns..."
                noOptionsMessage={
                  accessOptionsLoading
                    ? 'Loading campaigns...'
                    : 'No campaigns available for this world.'
                }
                loading={accessOptionsLoading}
                disabled={disabled}
              />
              <p className="help-text">
                Members of selected campaigns can view this entity.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor={readUsersId}>Users</label>
              <ListCollector
                inputId={readUsersId}
                selected={accessSettings.readUsers}
                options={accessOptions.users}
                onChange={(value) => onSettingChange('readUsers', value)}
                placeholder="Select users..."
                noOptionsMessage={
                  accessOptionsLoading
                    ? 'Loading users...'
                    : 'No eligible users found for this world.'
                }
                loading={accessOptionsLoading}
                disabled={disabled}
              />
              <p className="help-text">Choose players who have characters in this world.</p>
            </div>
          </>
        )}
      </div>

      <div className="entity-access-column">
        <h3>Write access</h3>
        <div className="form-group">
          <label htmlFor={writeModeId}>Write</label>
          <select
            id={writeModeId}
            value={accessSettings.writeMode}
            onChange={(event) => onSettingChange('writeMode', event.target.value)}
            disabled={disabled}
          >
            {ACCESS_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {accessSettings.writeMode === 'selective' && (
          <>
            <div className="form-group">
              <label htmlFor={writeCampaignsId}>Campaigns</label>
              <ListCollector
                inputId={writeCampaignsId}
                selected={accessSettings.writeCampaigns}
                options={accessOptions.campaigns}
                onChange={(value) => onSettingChange('writeCampaigns', value)}
                placeholder="Select campaigns..."
                noOptionsMessage={
                  accessOptionsLoading
                    ? 'Loading campaigns...'
                    : 'No campaigns available for this world.'
                }
                loading={accessOptionsLoading}
                disabled={disabled}
              />
              <p className="help-text">
                Dungeon Masters of these campaigns can edit this entity.
              </p>
            </div>

            <div className="form-group">
              <label htmlFor={writeUsersId}>Users</label>
              <ListCollector
                inputId={writeUsersId}
                selected={accessSettings.writeUsers}
                options={accessOptions.users}
                onChange={(value) => onSettingChange('writeUsers', value)}
                placeholder="Select users..."
                noOptionsMessage={
                  accessOptionsLoading
                    ? 'Loading users...'
                    : 'No eligible users found for this world.'
                }
                loading={accessOptionsLoading}
                disabled={disabled}
              />
              <p className="help-text">
                Grant edit access to specific players with characters here.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

