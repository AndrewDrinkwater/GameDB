// src/api/locationTypeFields.js
import api from './client.js'

// === Location Type Field API methods ===

export async function getLocationTypeFields(locationTypeId) {
  return api.get(`/location-types/${locationTypeId}/fields`)
}

export async function createLocationTypeField(locationTypeId, payload) {
  return api.post(`/location-types/${locationTypeId}/fields`, payload)
}

export async function updateLocationTypeField(fieldId, payload) {
  return api.patch(`/location-type-fields/${fieldId}`, payload)
}

export async function deleteLocationTypeField(fieldId) {
  return api.delete(`/location-type-fields/${fieldId}`)
}

