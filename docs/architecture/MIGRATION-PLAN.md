# Migration Plan

## Completed

- FE-44 - Companies, Items, and Settings Domain Consolidation

## FE-44 Result

- Companies, Items, and Settings now have explicit public feature entry points.
- Feature-owned model files were consolidated under each feature `model` folder.
- App route lazy imports now consume the Companies, Items, and Settings public feature APIs.
- Quotations consumers were updated to use public feature boundaries only.
- Query-key values, API URLs, payload mappers, schemas, validation rules, and mutation behavior were preserved by source move only.

## Next Phase

- FE-45 - Quotations Domain Consolidation

## Validation Status

Automated validation was not run because the active repository instructions prohibit npm commands, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.
