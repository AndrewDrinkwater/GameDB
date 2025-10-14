/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'

const FeatureFlagContext = createContext({})

const NORMALISED_TRUE_VALUES = new Set(['true', '1', 'yes', 'on'])

const normaliseFlagValue = (value) => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'boolean') return value
  const trimmed = String(value).trim().toLowerCase()
  if (trimmed === '') return undefined
  return NORMALISED_TRUE_VALUES.has(trimmed)
}

const resolveRelBuilderFlag = (initialValue) => {
  const provided = normaliseFlagValue(initialValue)
  if (provided !== undefined) return provided

  const envValue = normaliseFlagValue(import.meta.env.VITE_REL_BUILDER_V2)
  if (envValue !== undefined) return envValue

  return false
}

export function FeatureFlagProvider({ children, initialFeatures = {} }) {
  const relBuilderV2 = resolveRelBuilderFlag(initialFeatures.rel_builder_v2)

  const value = useMemo(
    () => ({
      ...initialFeatures,
      rel_builder_v2: relBuilderV2,
    }),
    [initialFeatures, relBuilderV2],
  )

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}

export const useFeatures = () => useContext(FeatureFlagContext)

export const useFeatureFlag = (flagName) => {
  const features = useFeatures()
  if (!flagName) return false
  return Boolean(features?.[flagName])
}

export default FeatureFlagContext
