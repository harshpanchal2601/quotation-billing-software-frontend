import { z } from 'zod';

const lineSchema = z.object({ itemId: z.number().int().positive().nullable(), itemName: z.string().max(191), quantity: z.string().regex(/^\d{1,12}(?:\.\d{1,3})?$/), unitRate: z.string().regex(/^\d{1,15}(?:\.\d{1,3})?$/), taxRate: z.string().regex(/^\d{1,3}(?:\.\d{1,2})?$/), measurementUnit: z.string().min(1).max(50), supplyType: z.enum(['GOODS', 'SERVICE']), discountType: z.literal('NONE'), discountValue: z.literal('0'), hsnCode: z.string().nullable().optional() });
const transferSchema = z.object({ source: z.literal('assistant'), firmId: z.number().int().positive(), actorId: z.number().int().positive(), kind: z.enum(['INVOICE', 'QUOTATION']), companyId: z.number().int().positive(), lines: z.array(lineSchema).min(1).max(100) });
export function readAssistantDraft(state: unknown, firmId: number | null | undefined, actorId: number | undefined, kind: 'INVOICE' | 'QUOTATION') {
  const parsed = transferSchema.safeParse(state);
  return parsed.success && parsed.data.firmId === firmId && parsed.data.actorId === actorId && parsed.data.kind === kind ? parsed.data : undefined;
}
