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
