# Project Status

## FE-44 - Companies, Items, and Settings Domain Consolidation

Status: implementation complete; automated validation not run.

### Companies Final Structure

- `api`: companies, contacts, and addresses API clients.
- `model`: company types, query keys, schemas, mappers, and helpers.
- `pages`: list, create, edit, and detail route pages.
- `components`: company forms, dialogs, tables, detail sections, status chip, and quotation history.
- `index.ts`: narrow public feature API.

### Items Final Structure

- `api`: item API client.
- `model`: item types, query keys, schema, and helpers.
- `pages`: list, create, edit, and detail route pages.
- `components`: item form, table, image section, confirm dialogs, and specifications field.
- `index.ts`: narrow public feature API.

### Settings Final Structure

- `api`: business profile, quotation settings, and bank details API clients.
- `model`: settings types, schemas, and helpers.
- `pages`: business settings, quotation settings, and bank details route pages.
- `components`: settings sections, branding asset card, colour field, bank dialogs, and bank table.
- `index.ts`: narrow public feature API.

### Public Boundaries

- App route imports for Companies, Items, and Settings use public feature entry points.
- Quotations imports Companies, Items, and Settings through public feature entry points.
- Categories and Measurement Units remain independent features consumed by Items through their existing public APIs.

### Files Moved

- Companies query keys, types, schemas, and utilities moved to `src/features/companies/model`.
- Items query keys, types, schema, and utilities moved to `src/features/items/model`.
- Settings types, schemas, and utilities moved to `src/features/settings/model`.
- Neutral asset URL resolution moved to `src/shared/api/assetUrl.ts`.

### Files Removed

- Obsolete feature `.gitkeep` placeholders in Companies and Items.
- Empty Companies and Settings `schemas` folders after schema moves.

### Exceptions

- The former feature-to-app route helper exception was resolved in FE-46 by moving route path and return-navigation contracts to Shared.
- Shared test render helper still imports Auth as a test-harness exception.

### Validation

- Static validation completed by source inspection and search.
- Automated validation was not run because active repository instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

### Behavior Preservation

API URLs, HTTP methods, query-key values, schemas, validation messages, form payload mapping, mutation behavior, cache invalidation, navigation, upload/image behavior, and responsive JSX were preserved.

### Next Phase

FE-45 - Quotations Domain Consolidation.

## FE-45 - Quotations Domain Consolidation

Status: implementation complete; automated validation not run by Codex.

### Quotations Structure Before

- Core query keys, schema, types, and helpers were root-level Quotations files.
- Documents/PDF and attachments used root-level type/query/helper files and shared component/API folders.
- Email UI was in the shared Quotations component folder.
- App and Dashboard deep-imported Quotations internals.

### Quotations Structure After

- `api`: core Quotations API client.
- `model`: core Quotations query keys, schema, types, date/status/calculation helpers, and mappers.
- `documents`: document/PDF API, query keys, types, history, communication history, PDF preview, and email integration point.
- `attachments`: attachment API, query keys, types, helpers, upload, preview/download, list, and delete UI.
- `email`: quotation email dialog.
- `pages`: list, create, edit, and detail route pages.
- `components`: core form, line items, totals, filters, status, delete dialog, and table components.
- `index.ts`: narrow public feature API.

### Behaviour Preservation

API URLs, HTTP methods, query-key values, schemas, validation messages, form payload mapping, calculation helpers, date helpers, status transitions, revision flow, PDF preview/download, attachment upload/download/delete, email payload/lifecycle, communication history, mutation invalidation, object URL cleanup, navigation, and responsive JSX were preserved.

### Files Moved

- Core query keys, schema, types, and utilities moved to `src/features/quotations/model`.
- Document API, query keys, types, document section, and PDF preview dialog moved under `src/features/quotations/documents`.
- Attachment API, query keys, types, helpers, and attachment UI moved under `src/features/quotations/attachments`.
- Email dialog moved under `src/features/quotations/email`.

### Files Removed

- Obsolete Quotations `.gitkeep` placeholder.

### Public Boundaries

- App imports Quotations route pages through `@features/quotations`.
- Dashboard imports Quotations status chip, status type, and currency formatter through `@features/quotations`.
- Quotations consumes Companies, Items, Settings, and Dashboard through public feature entry points.

### Exceptions

- The former feature-to-app route helper exception was resolved in FE-46 by moving route path and return-navigation contracts to Shared.

### Validation

- Static validation completed by source inspection and search.
- Automated validation was not run by Codex because active repository instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

### Next Phase

FE-46 - Frontend Cleanup and Enforcement.

## FE-46 - Frontend Cleanup and Enforcement

Status: implementation complete; automated validation not run by Codex.

### Boundary Cleanup

- Production feature imports no longer depend on `@app/router`.
- Route paths moved to `src/shared/routing/paths.ts`.
- Return-navigation helpers moved to `src/shared/routing/returnNavigation.ts`.
- App route metadata remains App-owned in `src/app/router/routeConfig.tsx`.
- Dashboard self-imports now use relative feature-internal imports instead of its public feature alias.

### Enforcement

- Added `src/architecture-boundaries.test.ts`.
- The test scans production `.ts` and `.tsx` source files and checks Shared, Feature, App, cross-feature, and self-public-entry boundaries.
- Test-only provider and route-guard imports remain accepted exceptions.

### Cleanup

- Removed obsolete `.gitkeep` placeholders under `src`.
- Removed empty stale directories left after previous consolidation.

### Documentation

- Updated import boundary and migration docs.
- Added shared UI migration matrix, frontend platform API, shared UI architecture, and MUI usage rules.

### Validation

- Static validation completed by source inspection and search.
- Automated validation was not run by Codex because active repository instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

### Risks & Assumptions

- The architecture boundary test must be run by the user through the existing test command because Codex is not permitted to execute npm/test commands in this session.

## FE-47 - Final Frontend Regression and Architecture Acceptance Audit

Status: complete with documented limitations.

### Architecture Result

- App, Shared, and Feature dependency boundaries were statically accepted.
- Shared production code imports no App or Feature production code.
- Feature production code imports no App production code.
- App and cross-feature imports use public feature entries.
- Public feature and Shared exports are explicit and narrow.
- Architecture enforcement exists in `src/architecture-boundaries.test.ts`.

### Regression Result

- No route, guard, lazy import, API URL/method, query key, invalidation, mutation lifecycle, form payload, validation rule, quotation calculation, revision, PDF, attachment, email, or communication-history source regression was found by static audit.
- One narrow accessibility correction was made on the login screen: the brand headline is no longer a second `h1` while preserving visual styling.

### Shared UI Result

- Reusable actions, dialogs, forms, layout, feedback, table shells, and display primitives remain adopted where appropriate.
- Direct MUI exceptions remain documented and intentional for feature-specific forms, cards, chips, previews, local loaders, and domain UI.
- Deferred primitives remain deferred because no stable business-neutral abstraction was proven during FE-47.

### Validation

- Static validation completed by source inspection and search.
- Automated validation was not run because active repository instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.
- Manual/browser validation was not run in this static-audit session.

### Closure Decision

Frontend architecture migration is closed with documented validation limitations. Product work may continue as normal feature development, not as a required architecture migration phase.
