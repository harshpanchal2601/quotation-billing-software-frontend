# Import Boundaries

## Approved Direction

- App may import Features and Shared.
- Features may import Shared.
- Cross-feature imports must use narrow public feature entry points.
- Shared production code must not import Features.

## FE-44 Public APIs

### Companies

`src/features/companies/index.ts` exports:

- `CompaniesPage`
- `CreateCompanyPage`
- `CompanyDetailsPage`
- `EditCompanyPage`
- `getCompanyRequest`
- `listCompaniesRequest`
- `CompanyAddress`
- `CompanyContact`

### Items

`src/features/items/index.ts` exports:

- `ItemsPage`
- `CreateItemPage`
- `ItemDetailsPage`
- `EditItemPage`
- `getItemOptionsRequest`
- `ItemOption`

### Settings

`src/features/settings/index.ts` exports:

- `BusinessSettingsPage`
- `QuotationSettingsPage`
- `BankDetailsPage`
- `getQuotationSettingsRequest`
- `listBankDetailsRequest`

## Cross-Feature Consumers

- Quotations imports Companies, Items, and Settings through the public feature entry points.
- Items imports Categories and Measurement Units through their public feature entry points.

## Retained Exceptions

- Companies and Items pages still import app route constants and return-navigation helpers from `@app/router`. This pre-existing pattern was not changed in FE-44 because moving router ownership is outside the Companies, Items, and Settings consolidation scope.
- `src/shared/test/render.tsx` imports Auth for test rendering. This is an existing test-harness dependency, not production Shared code.

## FE-45 Quotations Public API

`src/features/quotations/index.ts` exports:

- `QuotationsPage`
- `CreateQuotationPage`
- `QuotationDetailsPage`
- `EditQuotationPage`
- `QuotationStatusChip`
- `formatCurrency`
- `QuotationStatus`

## FE-45 Boundaries

- App routing imports Quotations route pages through `@features/quotations`.
- Dashboard imports `QuotationStatusChip`, `formatCurrency`, and `QuotationStatus` through `@features/quotations`.
- Quotations imports Companies, Items, Settings, and Dashboard only through public feature entry points.
- Shared production code imports no Quotations files.
- Quotations internals do not import their own public `index.ts`.

## FE-46 Enforcement

FE-46 should enforce public-boundary imports and decide whether the pre-existing feature-to-app router helper imports remain acceptable or should move behind an app-neutral navigation abstraction.
