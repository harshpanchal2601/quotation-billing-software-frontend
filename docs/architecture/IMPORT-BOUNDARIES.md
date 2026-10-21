# Import Boundaries

## Approved Direction

- App may import Features and Shared.
- Features may import Shared.
- Cross-feature imports must use narrow public feature entry points.
- Shared production code must not import Features.
- Shared production code must not import App.
- Features must not import App.
- Route path constants and list-return helpers live in `src/shared/routing` because they are string-only routing contracts used by multiple features.

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
- Dashboard imports Quotations display helpers through the public Quotations entry point.
- Quotations imports the public Dashboard query key to refresh dashboard data after quotation email/document activity.

## Retained Exceptions

- `src/shared/test/render.tsx` imports App theme/Auth providers for test rendering. This is an existing test-harness dependency, not production Shared code.
- `src/features/auth/__tests__/routes.test.tsx` imports App route guards because it directly tests route guard behaviour.

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

- Production feature-to-app router imports were removed.
- App route constants were moved behind `src/shared/routing/paths.ts`.
- Return-navigation helpers were moved behind `src/shared/routing/returnNavigation.ts`.
- `src/architecture-boundaries.test.ts` enforces production import boundaries:
  - Shared production code cannot import App or Features.
  - Feature production code cannot import App.
  - App production code can import Features only through public feature entries.
  - Cross-feature production imports must use public feature entries.
  - Feature internals cannot import their own public feature entry.

## FE-47 Verification

- Static source searches verified the documented production import boundaries.
- No Shared-to-App, Shared-to-Feature, Feature-to-App, deep cross-feature, self-barrel, or broad export-star production violation was found.
- Test-only exceptions remain limited to provider composition and route-guard tests.
