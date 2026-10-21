# MUI Usage Rules

## Preferred Shared APIs

- Use `AppButton` for reusable command buttons.
- Use `AppIconButton` for reusable icon actions.
- Use `ConfirmDialog` for generic confirmation flows.
- Use shared feedback, layout, form, and table primitives when they already cover the behaviour.

## Approved Direct MUI Usage

- App shell, provider, theme, route fallback, and navigation composition.
- Layout-only elements such as `Box`, `Stack`, `Grid`, `Divider`, `Paper`, and `Card`.
- Text, loading, and display primitives such as `Typography`, `Skeleton`, `Chip`, progress components, and responsive hooks.
- Feature-specific forms and selectors where validation, labels, or payload mapping are domain-owned.
- Feature-specific tables and mobile card layouts where row shape and actions are domain-owned.
- Shared UI implementation files that wrap MUI behind stable app primitives.

## Avoid New Direct MUI Usage

- Repeated app command buttons that should use shared action primitives.
- Repeated confirmation dialogs that should use `ConfirmDialog`.
- Repeated snackbar/error/loading patterns already covered by Shared.
- New table pagination or row-action shell code that duplicates Shared table primitives.

## Enforcement

Direct MUI usage is currently documented rather than automatically banned because feature screens still legitimately use MUI for layout and domain-specific composition. Dependency boundaries are enforced by `src/architecture-boundaries.test.ts`.

## FE-47 Direct MUI Classification

- `Button`, `IconButton`, `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`, `Snackbar`, `TableContainer`, and `TablePagination` are concentrated in Shared primitive implementation files.
- `Alert` remains valid for business warnings, informational notices, and shared error surfaces.
- `CircularProgress` remains valid for local loaders, row-level download states, upload/preview states, and Shared loader primitives.
- `TextField`, `Checkbox`, and `Switch` remain valid in Shared form adapters and feature-owned forms, filters, and specialized inputs.
- `Chip` remains valid for Shared status chips plus feature-owned counts, tags, primary/default markers, and quotation custom statuses.
- `Card` and `Paper` remain valid for app shell pages, feature detail sections, dashboard cards, preview surfaces, and mobile row cards.
- Direct image rendering remains limited to Shared `SafeImage`, the brand mark, and attachment preview surfaces; user-managed/backend images use `SafeImage` where appropriate.
