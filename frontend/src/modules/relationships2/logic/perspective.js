// src/modules/relationships2/logic/perspective.js

// mode: 'inline' | 'global'
// lockedField: 'from' | 'to' | null
export const computeFilterParams = ({ mode, lockedField = null, fromTypeId = '', toTypeId = '' }) => {
  let sourceType = ''
  let targetType = ''

  if (mode === 'inline' && lockedField === 'from') {
    sourceType = fromTypeId || ''
  } else if (mode === 'inline' && lockedField === 'to') {
    targetType = toTypeId || ''
  } else {
    // global or unlocked inline — constrain by whatever is selected (progressive)
    sourceType = fromTypeId || ''
    targetType = toTypeId   || ''
  }

  return { sourceType, targetType }
}
