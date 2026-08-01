# Current to Target Map

## FE-44 Companies, Items, and Settings

The frontend repository did not contain pre-existing architecture documentation at the start of FE-44. This file records the current feature ownership result created during the consolidation.

### Companies

- Route pages remain under `src/features/companies/pages`.
- Feature API clients remain under `src/features/companies/api`.
- Company types, query keys, schemas, submit-value mappers, and feature helpers now live under `src/features/companies/model`.
- Contacts and addresses remain Companies-owned through Companies API/model/component files.
- Company quotation history remains Companies-owned UI in `CompanyQuotationHistory`.
- The public API is `src/features/companies/index.ts` and exports only route pages plus the Companies requests/types consumed by Quotations.

### Items

- Route pages remain under `src/features/items/pages`.
- Item API client remains under `src/features/items/api`.
- Item types, query keys, schema, and feature helpers now live under `src/features/items/model`.
- Item image UI remains Items-owned in `ItemImageSection`.
- Category and Measurement Unit option dependencies continue to use their public feature exports.
- The public API is `src/features/items/index.ts` and exports only route pages plus the item option request/type consumed by Quotations.

### Settings

- Route pages remain under `src/features/settings/pages`.
- Settings API clients remain under `src/features/settings/api`.
- Settings types, schemas, and feature helpers now live under `src/features/settings/model`.
- Bank Details and Branding remain Settings-owned.
- Neutral storage asset URL resolution moved to `src/shared/api/assetUrl.ts` so Items no longer depends on Settings and Settings no longer depends on App config.
- The public API is `src/features/settings/index.ts` and exports only route pages plus the Settings requests consumed by Quotations.

### Deferred Quotations Cleanup

Quotations was not structurally migrated in FE-44. Its changes are limited to importing Companies, Items, and Settings through public feature entry points.

## FE-45 Quotations

### Before

- Core Quotations types, schema, query keys, and helpers lived at the Quotations feature root.
- Documents/PDF and attachments had separate API/type/query files but shared the root API and component folders.
- Email UI lived in the generic Quotations component folder.
- App and Dashboard deep-imported Quotations internals.

### After

- Core model ownership lives under `src/features/quotations/model`.
- Core API ownership remains under `src/features/quotations/api`.
- Documents/PDF and communication history live under `src/features/quotations/documents`.
- Attachments live under `src/features/quotations/attachments`.
- Email dialog ownership lives under `src/features/quotations/email`.
- Route pages remain under `src/features/quotations/pages`.
- Core form/list/status/table components remain under `src/features/quotations/components`.
- The public API is `src/features/quotations/index.ts` and exports route pages plus the narrow Dashboard-consumed status/formatting exports.

### Ownership Notes

- Calculations, date helpers, status helpers, schemas, and payload types remain Quotations-owned in `model`.
- Revision behaviour remains page/API/model-owned inside Quotations.
- Document/PDF preview, download, history, and communication history remain Quotations-owned.
- Attachment upload, preview, download, deletion, validation, and object URL handling remain Quotations-owned.
- Email recipient, document, attachment, and send behaviour remain Quotations-owned.
- App and Dashboard consume Quotations through the public feature boundary.

## FE-46 Cleanup and Enforcement

### Before

- Features still consumed app-owned route path constants and list-return helpers.
- Boundary rules were documented but not executable.
- Obsolete placeholder directories remained after previous feature consolidation.
- Shared UI usage expectations were split across implementation and prompt context.

### After

- Route path constants live in `src/shared/routing/paths.ts`.
- List-return navigation helpers live in `src/shared/routing/returnNavigation.ts`.
- `src/app/router/routeConfig.tsx` owns route metadata and re-exports the shared route path contract for existing app consumers.
- Production feature files import route path and return-navigation helpers from Shared instead of App.
- `src/architecture-boundaries.test.ts` provides executable boundary checks for production source files.
- Empty stale placeholder folders and `.gitkeep` files under `src` were removed.
- Architecture docs now describe shared UI migration status, MUI usage rules, and the frontend platform API.

### Remaining Accepted Exceptions

- Test infrastructure may import App/Features when it exists specifically to compose providers or test route guards.
- Direct MUI layout, typography, form-control composition, and feature-specific UI remain allowed while shared primitives cover reusable actions, dialogs, feedback, layout shells, and table shells.
