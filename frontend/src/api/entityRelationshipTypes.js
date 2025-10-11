import api from './client.js'

export const getRelationshipTypes = () =>
  api.get('/entity-relationship-types')
