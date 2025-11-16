export const ENTITY_CREATION_SCOPES = {
  OWNER_DMS: 'owner_dm',
  ALL_PLAYERS: 'all_players',
}

export const ENTITY_CREATION_SCOPE_OPTIONS = [
  { value: ENTITY_CREATION_SCOPES.OWNER_DMS, label: 'World Owner / DMs' },
  { value: ENTITY_CREATION_SCOPES.ALL_PLAYERS, label: 'All Players (campaign scoped)' },
]

export const getEntityCreationScopeLabel = (value) => {
  if (!value) {
    return ENTITY_CREATION_SCOPE_OPTIONS[0].label
  }
  const scopeValue = String(value).trim().toLowerCase()
  const option = ENTITY_CREATION_SCOPE_OPTIONS.find((entry) => entry.value === scopeValue)
  return option ? option.label : ENTITY_CREATION_SCOPE_OPTIONS[0].label
}
