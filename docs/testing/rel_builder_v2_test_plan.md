# Relationship Builder V2 Test Plan

This plan consolidates the coverage required before enabling the `rel_builder_v2` flag in production.

## Unit Tests

- `DrawerPanel` focus trap, escape handling, and lifecycle callbacks.
- `EntityMiniCreateInline` – ensures entity creation callbacks fire once and reset state.
- `PerspectiveToggle` – verifies perspective switching logic and accessible labelling.
- `EntitySelect` – debounce interval, pagination, and empty states.
- Validation mapping for source/target/duplicate cases.
- Toast and banner rendering for success/error flows.

## Integration Tests

1. **Create relationship from source perspective**
   - Preselects source entity.
   - Select target and relationship type.
   - Confirms toast with success message and list refresh.
2. **Create relationship from target perspective**
   - Uses perspective toggle to swap orientation.
3. **Inline entity creation**
   - Launch inline entity drawer, create entity, ensure it auto-selects.
4. **Validation of disallowed types**
   - Attempt to pick incompatible entity type and assert validation error.
5. **Duplicate detection**
   - Attempt to recreate existing relationship, expect blocker toast.

## End-to-End (Playwright/Cypress)

- Log in, open world, add entity → drawer opens → save → toast displayed.
- Create relationship with inline entity creation → saved relationship appears in table.
- Switch perspective, add incoming relationship, verify success.
- Attempt duplicate relationship → error toast, submit button disabled.
- Responsive test at 375px viewport to validate mobile layout.

## Regression Suite

- Legacy entity creation flow when `rel_builder_v2` is disabled.
- Ensure no console errors or unhandled rejections in browser logs.
- Database validation – confirm entities/relationships persisted with correct world and type IDs.

## Performance Checks

- Entity search completes within 300ms average on datasets with 500+ entities.
- Re-open drawer repeatedly to monitor memory footprint (React Profiler).
- Confirm no dropped frames during drawer animations.

## Telemetry Verification

- Capture analytics payloads for `relationship_form_opened`, `relationship_created`, `relationship_create_failed`, `inline_entity_created`, `entity_form_opened`, and `entity_created`.
- Validate that no payload contains entity names or user PII.

## Rollout Checklist

1. Flag disabled in production deploy.
2. Enable for internal admin/test worlds, run smoke tests.
3. Review telemetry dashboards and performance traces.
4. Expand rollout gradually and monitor error rates.
5. Remove legacy code paths once metrics remain stable for two full release cycles.
