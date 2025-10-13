# Relationship Builder Drawer

The relationship drawer is responsible for creating or editing links between two entities. Phase 5 introduced a V2 experience that lives behind the `rel_builder_v2` feature flag.

## Rendering logic

Consumers should render the builder through the `RelationshipBuilderComponent` wrapper that is already in use on:

- `EntityRelationshipList`
- `EntityDetailPage`

The wrapper selects between:

- **Legacy** – `EntityRelationshipForm` (the existing implementation)
- **V2** – `RelationshipDrawerV2` (temporary shim, to be replaced when the redesigned UI lands)

When the flag is enabled the new drawer will automatically be mounted in place of the legacy form without additional caller changes.

## Props surface

Both implementations share the same props:

| Prop | Purpose |
| ---- | ------- |
| `worldId` | Resolves the active world for lookups. |
| `relationshipId` | Enables edit mode when present. |
| `defaultFromEntityId` / `defaultToEntityId` | Pre-populate pickers when invoked from context. |
| `lockFromEntity` / `lockToEntity` | Prevent picker changes when context should not be edited. |
| `defaultPerspective` | Sets initial source/target orientation. |
| `onSaved` | Callback invoked once persistence succeeds. |
| `onCancel` | Notifies caller that the drawer should be closed. |
| `onToast` | Surfaces validation and success notifications. |
| `onStateChange` | Communicates submit/cancel button enablement. |

## Use cases

- **Creating a relationship and changing the type** – Switching the relationship type while selecting entities clears the opposi
te entity picker to avoid invalid pairings.
- **Selecting a type as the source entity** – When "This entity is the source" is chosen, the "Relationship type" step only dis
plays relationship definitions where the current entity type can act as the source.
- **Selecting a type as the target entity** – When "This entity is the target" is chosen, the "Relationship type" step only sho
ws relationship definitions where the current entity type can act as the target.

## Telemetry events

The V2 builder will emit the following events through the shared analytics pipeline:

| Event | Payload |
| ----- | ------- |
| `relationship_form_opened` | `{ perspective, worldId }` |
| `relationship_perspective_toggled` | `{ from, to }` |
| `relationship_created` | `{ typeId, fromType, toType }` |
| `relationship_create_failed` | `{ errorCode }` |
| `inline_entity_created` | `{ typeId, worldId }` |

> **Note:** Telemetry hooks should avoid sending entity names or user PII. Use IDs and enum values only.

## Accessibility checklist

- The drawer must trap focus when open and restore focus on close.
- All inputs require visible labels and screen-reader friendly associations via `aria-labelledby` / `aria-describedby`.
- Validation messages must be announced with `role="alert"`.
- Keyboard shortcuts: `Esc` closes the drawer, `Tab`/`Shift+Tab` cycles through focusable elements.

## Mobile behaviour

- Screens ≤ 600px render the drawer as full-screen.
- All tap targets should be ≥ 44px.
- Toasts/banners anchor to the top of the viewport to avoid covering primary actions.

## Migration plan

1. Ship Phase 5 behind `rel_builder_v2`.
2. Collect QA + telemetry feedback.
3. Gradually enable for internal worlds, then wider cohorts.
4. Once metrics clear, delete the legacy `EntityRelationshipForm` entry points.
