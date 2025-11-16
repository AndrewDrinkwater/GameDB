export const RELATIONSHIP_FILTER_MODES = ['all', 'include', 'exclude']

export const createDefaultRelationshipFilters = () => ({
  relationshipTypes: { mode: 'all', values: [] },
  relatedEntityTypes: { mode: 'all', values: [] },
})
