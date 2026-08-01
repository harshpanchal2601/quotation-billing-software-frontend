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
