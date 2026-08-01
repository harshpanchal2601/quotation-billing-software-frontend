# Shared UI Architecture

## Purpose

Shared UI provides reusable, business-neutral building blocks for route pages, actions, dialogs, feedback, forms, tables, and common display helpers.

## Dependency Direction

- Shared UI may import MUI, React, and other Shared modules.
- Shared UI must not import App or Features in production code.
- App and Features may import Shared UI.
- Shared UI components must expose generic props and receive feature-specific labels, values, handlers, and children from callers.

## Component Shape

- Prefer thin primitives that centralize behaviour, accessibility, spacing, loading states, or visual policy.
- Keep domain decisions in features.
- Avoid wrappers that only mirror a MUI component without adding stable app value.
- Prefer composition through `children`, slots, or typed callback props over importing feature code.

## Current Coverage

- Actions: reusable button and icon-button behaviour.
- Dialogs: confirmation dialog shell.
- Feedback: loaders, snackbars, and server error alerts.
- Layout: page containers and page headers.
- Tables: table container, pagination, row actions, and skeletons.
- Forms: controlled MUI field adapters.
- Common display: image safety, empty/error/loading states, avatars, and refresh indicators.
