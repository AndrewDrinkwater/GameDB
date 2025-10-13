import { cfg, isFeatureEnabled } from '../config/env.js'

export const REL_BUILDER_FLAG = 'rel_builder_v2'

export const isRelBuilderV2Enabled = () => isFeatureEnabled(REL_BUILDER_FLAG)

export const applyRelBuilderHeader = (res) => {
  if (isRelBuilderV2Enabled()) {
    res.setHeader('X-Feature-RelBuilder-V2', 'true')
  }
}

export const getFeatureSnapshot = () => ({ ...cfg.features })
