export const quotationDocumentsQueryKeys = {
  all: ['quotation-documents'] as const,
  list: (quotationId: number, params?: Record<string, unknown>) =>
    [...quotationDocumentsQueryKeys.all, quotationId, ...(params ? [params] : [])] as const,
  communications: (quotationId: number, params?: Record<string, unknown>) =>
    [...quotationDocumentsQueryKeys.all, 'communications', quotationId, ...(params ? [params] : [])] as const,
};
