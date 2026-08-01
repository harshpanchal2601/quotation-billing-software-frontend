export const quotationAttachmentsQueryKeys = {
  all: ['quotation-attachments'] as const,
  list: (quotationId: number) => [...quotationAttachmentsQueryKeys.all, quotationId] as const,
};
