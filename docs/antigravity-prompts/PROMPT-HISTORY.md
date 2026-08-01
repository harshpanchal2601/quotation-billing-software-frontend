# Prompt History

## FE-44 - Companies, Items, and Settings Domain Consolidation

Scope: consolidate frontend feature ownership for Companies, Items, and Settings without changing behavior or API contracts.

Companies changes: moved feature model files into `model`, retained contacts, addresses, and quotation history as Companies-owned, and added a narrow public feature API.

Items changes: moved feature model files into `model`, retained item image behavior inside Items, preserved Categories and Measurement Units public-feature dependencies, and added a narrow public feature API.

Settings changes: moved feature model files into `model`, retained Business Settings, Quotation Settings, Bank Details, and Branding ownership, and added a narrow public feature API.

Public boundaries: app routes and Quotations consumers now import Companies, Items, and Settings through public feature indexes.

Cleanup: removed obsolete `.gitkeep` placeholders and empty schema folders after verified moves.

Validation: static source inspection and boundary searches were performed. Automated validation was not run because active instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

Exceptions: pre-existing feature-to-app route helper imports remain outside FE-44 scope; Shared test render retains its Auth test-harness dependency.

Behavior preservation: query keys, API URLs, HTTP methods, payload mappings, schemas, validation, mutation behavior, cache invalidation, navigation, and upload/image behavior were preserved.

Next phase: FE-45 - Quotations Domain Consolidation.
