# Migration Plan

## Completed

- FE-44 - Companies, Items, and Settings Domain Consolidation
- FE-45 - Quotations Domain Consolidation
- FE-46 - Frontend Cleanup and Enforcement
- FE-47 - Final Frontend Regression and Architecture Acceptance Audit

## FE-44 Result

- Companies, Items, and Settings now have explicit public feature entry points.
- Feature-owned model files were consolidated under each feature `model` folder.
- App route lazy imports now consume the Companies, Items, and Settings public feature APIs.
- Quotations consumers were updated to use public feature boundaries only.
- Query-key values, API URLs, payload mappers, schemas, validation rules, and mutation behavior were preserved by source move only.

## FE-45 Result

- Quotations now has an explicit public feature entry point.
- Core Quotations model files were consolidated under `src/features/quotations/model`.
- Documents/PDF, attachments, and email were organized into capability folders inside Quotations.
- App route lazy imports now consume the Quotations public feature API.
- Dashboard consumers now use the Quotations public feature API.
- Query-key values, API URLs, payload mappers, schemas, validation rules, calculations, mutation side effects, and object URL lifecycles were preserved by source move only.

## FE-46 Result

- Production feature-to-app routing imports were removed.
- Shared route path and return-navigation contracts were added under `src/shared/routing`.
- App route configuration now consumes and re-exports shared route paths while retaining route metadata ownership.
- Obsolete empty folders and `.gitkeep` placeholders under `src` were removed.
- `src/architecture-boundaries.test.ts` was added to enforce production dependency boundaries.
- Shared UI, MUI usage, frontend platform API, and migration matrix documentation was added.

## FE-47 Result

- Final static acceptance audit found no blocker or major architecture regression.
- App, Shared, Feature, cross-feature, public export, routing, API, query-key, mutation, form, shared UI, direct MUI, responsive, accessibility, and documentation surfaces were audited by source inspection and search.
- One narrow source correction changed the login brand headline from an additional `h1` to a paragraph rendered with the same visual variant.
- FE-47 documentation was updated to record final acceptance and validation limitations.
- No further required architecture migration phase remains.

## Future Development

- Continue incremental shared UI adoption only when a duplicated pattern is proven and behaviour can be preserved.

## Validation Status

Automated validation was not run because the active repository instructions prohibit npm commands, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands. Manual/browser validation was not run in this static-audit session.
