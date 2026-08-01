# Shared UI Migration Matrix

## Adopted Shared Primitives

| Area | Shared API | Status |
| --- | --- | --- |
| Actions | `src/shared/ui/actions/AppButton.tsx` | Adopted for reusable app command styling. |
| Actions | `src/shared/ui/actions/AppIconButton.tsx` | Adopted for icon-only app actions. |
| Dialogs | `src/shared/ui/dialogs/ConfirmDialog.tsx` | Adopted for reusable confirmation shells. |
| Feedback | `src/shared/ui/feedback` | Adopted for reusable loader, snackbar, and server-error states. |
| Layout | `src/shared/ui/layout/PageContainer.tsx`, `PageHeader.tsx` | Adopted for route page structure. |
| Tables | `src/shared/ui/tables` | Adopted for reusable table shell, pagination, row actions, and skeletons. |
| Forms | `src/shared/forms/controlled` | Adopted for reusable controlled field wiring. |
| Media | `src/shared/components/common/SafeImage.tsx` | Adopted for reusable image fallback behaviour. |

## Keep Feature-Owned

| Area | Reason |
| --- | --- |
| Quotation line-item rows, totals, status transitions, documents, attachments, and email | Domain rules and mutation behaviour are Quotations-owned. |
| Company contacts, addresses, status, and quotation history | Domain model and presentation are Companies-owned. |
| Item specifications and image upload sections | Payload shape and upload lifecycle are Items-owned. |
| Settings branding, colours, bank details, and quotation settings sections | Settings domain rules and API contracts are feature-owned. |
| Category and Measurement Unit dialogs/tables | Small feature-specific CRUD flows with local schemas and copy. |

## Migration Rule

Move UI into Shared only when at least two production consumers need the same business-neutral behaviour and the shared component can be implemented without App or Feature imports.

## Deferred Primitive Decisions

| Primitive | FE-47 decision | Evidence |
| --- | --- | --- |
| `ControlledSelect` | Deferred, not created. | Select usage remains feature-specific for option loading, labels, and payload mapping. |
| `ControlledNumberField` | Deferred, not created. | Number/currency/rate fields remain tied to quotation/item validation and conversion rules. |
| `ControlledDateField` | Deferred, not created. | Date fields remain local search/filter or quotation-domain inputs. |
| `PageActions` | Deferred, not created. | `PageHeader` actions cover current reusable page action placement. |
| `SectionCard` | Deferred, not created. | Current cards are domain sections, dashboard cards, previews, or mobile row layouts. |
| `DetailHeader` | Deferred, not created. | Company, Item, and Quotation details have intentionally different domain headers. |
| `LoadingOverlay` | Deferred, not created. | Existing full-page, inline, table, shaped, row, upload, and preview loaders are sufficient. |
| `PreviewDialogShell` | Deferred, not created. | PDF and attachment previews have different sizing, MIME, and object URL lifecycles. |
| `TableToolbar` | Deferred, not created. | Search/filter/sort controls remain feature-owned because query params differ by domain. |

## FE-47 Verification Result

Static audit accepted the Shared UI adoption state. Direct/local exceptions remain intentional and documented; no new shared primitive was required.
