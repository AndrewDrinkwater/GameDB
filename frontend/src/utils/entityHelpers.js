export const withEntityImageFields = (entity) => {
  if (!entity || typeof entity !== 'object') {
    return entity
  }

  const imageData =
    entity.imageData !== undefined
      ? entity.imageData
      : entity.image_data !== undefined
        ? entity.image_data
        : null

  const imageMimeType =
    entity.imageMimeType !== undefined
      ? entity.imageMimeType
      : entity.image_mime_type !== undefined
        ? entity.image_mime_type
        : null

  if (entity.imageData === imageData && entity.imageMimeType === imageMimeType) {
    return entity
  }

  return {
    ...entity,
    imageData,
    imageMimeType,
  }
}

export const resolveEntityResponse = (response) => {
  if (!response || typeof response !== 'object') {
    return null
  }

  const directEntity = (() => {
    if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      return response.data
    }
    if (response.entity && typeof response.entity === 'object' && 'id' in response.entity) {
      return response.entity
    }
    if ('id' in response) {
      return response
    }
    return null
  })()

  if (!directEntity) {
    return null
  }

  return withEntityImageFields(directEntity)
}

export const buildEntityImageUrl = (entity) => {
  if (!entity || typeof entity !== 'object') return ''
  const imageData = entity.imageData ?? entity.image_data
  const imageMimeType = entity.imageMimeType ?? entity.image_mime_type
  if (!imageData || !imageMimeType) return ''
  return `data:${imageMimeType};base64,${imageData}`
}
