# Frontend Platform API

## App

- `src/app/router/routeConfig.tsx` owns route metadata, navigation items, and lazy route wiring.
- `src/app/router/routeConfig.tsx` re-exports `paths` and `AppRoutePath` from Shared for existing app consumers.
- `src/app/router/guards` owns route guard behaviour.
- `src/app/providers` owns app-level provider composition.
- `src/app/theme` owns MUI theme configuration.

## Shared

- `src/shared/api` owns app-neutral API helpers such as asset URL resolution.
- `src/shared/routing/paths.ts` owns stable route path string constants.
- `src/shared/routing/returnNavigation.ts` owns app-neutral list-return path validation.
- `src/shared/ui` owns reusable business-neutral UI primitives.
- `src/shared/forms` owns reusable form-control wiring.
- `src/shared/components/common` owns reusable common display helpers.
- `src/shared/test` owns test composition helpers and is excluded from production dependency-boundary rules.

## Features

- Each feature public API is `src/features/<feature>/index.ts`.
- App and cross-feature consumers must import another feature through that public API.
- Feature internals should use relative imports inside the same feature.
- Feature-owned API clients, schemas, query keys, types, mappers, and domain helpers stay inside that feature.

## Tests

- Tests may import the unit under test directly, including App route guards or provider composition.
- Test-only helpers may compose App and Feature providers.
- Production boundary enforcement intentionally excludes `*.test.*`, `*.spec.*`, `__tests__`, and `src/shared/test`.
