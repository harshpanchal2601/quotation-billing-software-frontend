# Shared UI Adoption Rules

## Ownership

- Shared UI primitives must remain business-neutral.
- Shared UI may depend on MUI, React, and Shared utilities.
- Shared UI production code must not import App or Features.
- Feature-specific state, copy, permissions, API payloads, and domain formatting stay inside the owning feature.

## Use Shared Primitives

- Use `AppButton` and `AppIconButton` for reusable command buttons.
- Use `ConfirmDialog` for reusable destructive or confirmation flows.
- Use shared feedback components for app-wide loading, errors, and snackbar patterns.
- Use shared layout/table shells when the consuming code only supplies feature data, columns, actions, or copy.

## Direct MUI Is Allowed For

- Layout composition: `Box`, `Stack`, `Grid`, `Divider`, `Paper`, `Card`, and responsive hooks.
- Text and display composition: `Typography`, `Chip`, `Skeleton`, and progress indicators.
- Feature-specific forms: `TextField`, `Select`, `Autocomplete`, `Checkbox`, `Switch`, and related form-control components.
- Feature-specific tables where columns, mobile card rendering, or domain actions are unique.
- App infrastructure such as theme, providers, shell layout, breadcrumbs, and route fallback pages.

## Do Not Add New Shared UI For

- Single-use feature screens.
- Domain-specific labels, statuses, schema decisions, or mutation flows.
- Components that would need feature imports to work.
- Wrappers that only rename a MUI component without centralizing behaviour or design policy.

## FE-45 Quotations Ownership Clarification

- Quotation calculations remain feature-owned.
- Quotation date, status, and revision logic remain feature-owned.
- Quotation documents/PDF behaviour remains feature-owned.
- Quotation attachments and upload policy remain feature-owned.
- Quotation email recipient/payload behaviour remains feature-owned.
- Quotation communication history remains feature-owned.
- Shared UI primitives remain business-neutral and must not import Quotations.
