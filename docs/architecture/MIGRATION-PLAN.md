# Migration Plan

## Completed

- FE-44 - Companies, Items, and Settings Domain Consolidation
- FE-45 - Quotations Domain Consolidation

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

## Next Phase

- FE-46 - Frontend Cleanup and Enforcement

## Validation Status

Automated validation was not run because the active repository instructions prohibit npm commands, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.
