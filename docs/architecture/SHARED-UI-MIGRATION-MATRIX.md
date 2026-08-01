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
