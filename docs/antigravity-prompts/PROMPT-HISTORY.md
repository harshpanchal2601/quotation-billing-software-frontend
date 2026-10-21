# Prompt History

## FE-44 - Companies, Items, and Settings Domain Consolidation

Scope: consolidate frontend feature ownership for Companies, Items, and Settings without changing behavior or API contracts.

Companies changes: moved feature model files into `model`, retained contacts, addresses, and quotation history as Companies-owned, and added a narrow public feature API.

Items changes: moved feature model files into `model`, retained item image behavior inside Items, preserved Categories and Measurement Units public-feature dependencies, and added a narrow public feature API.

Settings changes: moved feature model files into `model`, retained Business Settings, Quotation Settings, Bank Details, and Branding ownership, and added a narrow public feature API.

Public boundaries: app routes and Quotations consumers now import Companies, Items, and Settings through public feature indexes.

Cleanup: removed obsolete `.gitkeep` placeholders and empty schema folders after verified moves.

Validation: static source inspection and boundary searches were performed. Automated validation was not run because active instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

Exceptions: pre-existing feature-to-app route helper imports were outside FE-44 scope and were later resolved in FE-46; Shared test render retains its Auth test-harness dependency.

Behavior preservation: query keys, API URLs, HTTP methods, payload mappings, schemas, validation, mutation behavior, cache invalidation, navigation, and upload/image behavior were preserved.

Next phase: FE-45 - Quotations Domain Consolidation.

## FE-45 - Quotations Domain Consolidation

Scope: consolidate internal frontend ownership for the Quotations feature without changing behaviour or API contracts.

Structural changes: core model files moved into `model`; Documents/PDF moved into `documents`; Attachments moved into `attachments`; Email moved into `email`; a narrow Quotations public API was added.

Core Quotations: route pages, core API, form, list, detail, status, schema, query keys, payload mapping, dates, and calculation helpers remain Quotations-owned.

Calculations: calculation preview input helpers remain feature-owned and unchanged.

Revisions: revision API and route/page behaviour remain Quotations-owned and unchanged.

Documents/PDF: document history, communication history, PDF generation, preview, download, and object URL lifecycle remain Quotations-owned.

Attachments: attachment API, upload, preview/download, deletion, validation, progress, and object URL lifecycle remain Quotations-owned.

Email: send dialog, recipients, selected document, selected attachments, payload, and lifecycle remain Quotations-owned.

Communications: communication history remains document-capability-owned and revision-aware.

Public boundaries: App and Dashboard now consume Quotations through `src/features/quotations/index.ts`.

Cleanup: removed the obsolete Quotations `.gitkeep` placeholder.

Validation: static source inspection and boundary searches were performed. Automated validation was not run by Codex because active instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

Exceptions: pre-existing feature-to-app route helper imports were outside FE-45 scope and were later resolved in FE-46.

Behaviour preservation: query keys, API URLs, HTTP methods, payload mapping, validation, calculations, revision behaviour, PDF behaviour, attachment behaviour, email behaviour, communication history, mutation invalidation, navigation, responsive JSX, and object URL cleanup were preserved.

Next phase: FE-46 - Frontend Cleanup and Enforcement.

## FE-46 - Frontend Cleanup and Enforcement

Scope: clean stale frontend structure, remove production dependency-boundary exceptions, and add executable guardrails without changing behaviour, APIs, or UI.

Precondition: FE-45 Quotations consolidation was present; app and Dashboard consumed Quotations through the public feature API.

Boundary changes: route paths moved to `src/shared/routing/paths.ts`; list-return helpers moved to `src/shared/routing/returnNavigation.ts`; feature production files no longer import app router modules.

Cleanup: removed obsolete `.gitkeep` placeholders and empty stale directories under `src`.

Enforcement: added `src/architecture-boundaries.test.ts` to scan production source imports and reject Shared-to-App/Features, Feature-to-App, App-to-feature-internal, cross-feature-internal, and feature self-public-entry imports.

Documentation: updated architecture maps/status and added shared UI migration, platform API, shared UI architecture, and MUI usage rules.

Exceptions: shared test render and auth route-guard tests may import App/Features because they are test-only infrastructure.

Validation: static source inspection and boundary searches were performed. Automated validation was not run by Codex because active instructions prohibit npm, lint, typecheck, tests, build, install, Docker, deployment, migrations, and git commands.

## FE-47 - Final Frontend Regression and Architecture Acceptance Audit

Scope: perform the final frontend-wide static regression, architecture, shared UI, feature boundary, documentation, responsiveness, and accessibility acceptance audit without backend changes.

Architecture result: App, Shared, and Feature ownership was accepted by source inspection and boundary searches; production Shared-to-App/Feature, Feature-to-App, deep cross-feature, self-barrel, and broad export-star violations were not found.

Regression result: no route, API contract, query-key, invalidation, mutation, form payload, validation, calculation, revision, PDF, attachment, email, or communication-history source regression was found.

Shared UI result: adopted primitives remain in use where appropriate; direct MUI exceptions and deferred primitives remain intentional and documented.

Feature result: Auth, Dashboard, Categories, Measurement Units, Companies, Items, Settings, and Quotations retain feature-owned APIs, models, schemas, query keys, mutations, pages, components, and narrow public exports.

Responsive/accessibility result: source-level responsive patterns remain consistent; one accessibility correction changed the login brand headline from a second `h1` to a paragraph with the same visual variant.

Validation: static validation completed. Automated lint, typecheck, tests, build, and manual/browser validation were not run because active instructions prohibit npm/test/build commands and this was a static-audit session.

Corrections made: one semantic login heading fix and documentation updates.

Exceptions: test-only provider composition and route-guard tests may import App/Features; direct MUI feature-owned composition remains documented.

Final closure decision: complete with documented limitations.
