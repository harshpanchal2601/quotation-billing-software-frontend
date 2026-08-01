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

- Feature pages still import app route constants and return-navigation helpers. This is a retained pre-existing app routing dependency outside FE-44 scope.
- Shared test render helper still imports Auth as a test-harness exception.

### Validation

- Static validation completed by source inspection and search.
- Automated validation was not run because active repository instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

### Behavior Preservation

API URLs, HTTP methods, query-key values, schemas, validation messages, form payload mapping, mutation behavior, cache invalidation, navigation, upload/image behavior, and responsive JSX were preserved.

### Next Phase

FE-45 - Quotations Domain Consolidation.
