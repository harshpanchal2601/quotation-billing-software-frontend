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
