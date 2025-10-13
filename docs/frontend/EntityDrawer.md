# Entity Drawer

The entity drawer powers inline entity creation throughout the relationship builder and other admin tools.

## Components

- `DrawerPanel` – handles the shell, focus trap, and responsive behaviour.
- `EntityMiniCreateInline` – small footprint form for creating entities on the fly.
- `EntitySelect` – async search dropdown supporting pagination and debounce.

## Accessibility targets

- Drawer traps focus and restores focus on close.
- Every input is paired with a `<label>` or `aria-label`.
- Helper text links inputs to hints using `aria-describedby`.
- Validation errors use `role="alert"` to be announced by screen readers.
- Keyboard close (`Esc`) is wired through `DrawerPanel`.

## Mobile guidelines

- Breakpoint: ≤ 600px renders the drawer full-screen.
- Ensure tap targets (buttons, inputs, toggles) are at least 44px tall.
- Toasts/banners reposition to the top edge to avoid overlapping the bottom action bar.

## Telemetry hooks

Inline entity creation should emit:

| Event | Payload |
| ----- | ------- |
| `entity_form_opened` | `{ worldId }` |
| `entity_created` | `{ typeId }` |

Use the shared analytics dispatcher (`/analytics` endpoint in prod, console logging in dev) and guard against duplicate submissions by debouncing the submit handler.

## Validation flow

1. Client performs quick checks (required fields, duplicate name detection).
2. Server validates metadata via `entityMetadataValidator` before persistence.
3. Errors bubble back to the drawer via `onToast` so the calling screen can show the appropriate message.
