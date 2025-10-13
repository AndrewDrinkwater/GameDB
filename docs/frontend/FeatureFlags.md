# Feature Flags

Feature flags allow us to run staged rollouts without redeploying the application. Flags are available on both the backend and frontend.

## rel_builder_v2

- **Environment variable:** `FEATURE_REL_BUILDER_V2`
- **Frontend override:** `VITE_REL_BUILDER_V2`
- **Default:** `false`
- **Purpose:** Controls access to the Relationship Builder V2 experience.

### Frontend usage

Flags are exposed through `FeatureFlagProvider` in `src/context/FeatureFlagContext.jsx`.

```jsx
import { useFeatureFlag } from '../../context/FeatureFlagContext.jsx'

const enabled = useFeatureFlag('rel_builder_v2')
```

When the provider is mounted the flag resolves in the following order:

1. Explicit override passed via the `initialFeatures` prop.
2. Vite environment variable (`VITE_REL_BUILDER_V2`).
3. Fallback to `false`.

### Backend usage

The backend reads `FEATURE_REL_BUILDER_V2` at boot (see `backend/src/config/env.js`). Controllers can check the resolved value via `isFeatureEnabled('rel_builder_v2')` or apply response headers with `applyRelBuilderHeader`.

When enabled the API attaches `X-Feature-RelBuilder-V2: true` so clients can confirm that the new experience is active.

### Rollout checklist

1. Deploy with flag disabled to production.
2. Enable for internal admin/test worlds by setting the environment variable.
3. Monitor telemetry (`relationship_*` and `entity_*` events) and performance metrics.
4. Gradually roll out to cohorts until 100% coverage.
5. Remove legacy components after stability is confirmed.
