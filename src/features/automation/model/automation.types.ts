export type DefinitionKind = 'WORKFLOW' | 'APPROVAL' | 'TEMPLATE' | 'CUSTOM_FIELDS' | 'NOTIFICATION';
export type Trigger = 'invoice.issued' | 'invoice.voided' | 'credit-note.issued' | 'order.confirmed' | 'stock.adjusted' | 'quotation.sent';
export type ApprovalAction = 'INVOICE_ISSUE' | 'INVOICE_VOID' | 'CREDIT_NOTE_ISSUE' | 'ORDER_CONFIRM' | 'STOCK_ADJUST' | 'QUOTATION_SEND';
export type Predicate = { field: 'trigger' | 'status' | 'currency' | 'total' | 'discountPercent'; operator: 'EQ' | 'NE' | 'GTE' | 'LTE'; value: string };
export type Step = { id: string; type: 'TEST'; predicate: Predicate; yes: string; no: string }
  | { id: string; type: 'NOTIFY'; title: string; body: string; recipientIds: number[]; next: string }
  | { id: string; type: 'STOP' };
export type Workflow = { enabled: boolean; name: string; trigger: Trigger; delayMinutes: number; expiresAfterMinutes: number; entry: string; steps: Step[] };
export type ApprovalPolicy = { enabled: boolean; action: ApprovalAction; expiresAfterHours: number; authority: 'OTHER_FIRM_ADMIN'; minimumAmount?: string; currency?: string; discountPercent?: string };
export type DocumentTemplate = { enabled: boolean; entity: 'QUOTATION' | 'INVOICE' | 'NOTICE'; heading: string; footer: string; primaryColour: string };
export type CustomField = { key: string; label: string; type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'; required: boolean; searchable: boolean; visibility: 'INTERNAL' | 'DOCUMENT'; classification: 'BUSINESS'; options: string[] };
export type FieldConfiguration = { enabled: boolean; entity: 'COMPANY' | 'ITEM' | 'QUOTATION' | 'INVOICE'; fields: CustomField[] };
export type Definition = Workflow | ApprovalPolicy | DocumentTemplate | FieldConfiguration;
export type PublishedDefinition = { id: number; kind: DefinitionKind; key: string; version: number; definition: Definition; publishedById: number; publishedAt: string };
export type Preference = { enabled: boolean; utcOffsetMinutes: number; quietStartMinute: number | null; quietEndMinute: number | null };
export type Command = { action: ApprovalAction; entityId: number; [key: string]: unknown };
export type Approval = { id: string; requesterId: number; requester?: { id: number; name: string }; policyId: number; command: Command; evidence: Record<string, string | number>; status: string; expiresAt: string; consumedAt: string | null; createdAt: string; policy: PublishedDefinition; decisions: Array<{ id: number; actorId: number; actor?: { id: number; name: string }; decision: string; reason: string; createdAt: string }> };
export type Run = { id: string; actorId: number; sourceEventId: string; status: string; reason: string | null; createdAt: string; expiresAt: string; definition: PublishedDefinition; actions: Array<{ id: number; step: string; outcome: string }>; logs: Array<{ id: number; userId: number | null; newValues: { reason?: string; step?: string; recipientId?: number; status?: string }; createdAt: string }>; jobs: Array<{ id: string; kind: string; status: string; attempts: number; availableAt: string; jobAttempts: Array<{ id: number; attempt: number; outcome: string | null; errorCode: string | null }> }> };
export type FieldValues = Record<string, string | boolean | null>;
export type FieldRecord = { id: number; version: number; definitionId: number; values: FieldValues; definition: PublishedDefinition };
export const definitionPaths: Record<DefinitionKind, string> = { WORKFLOW: '/automation/workflows', APPROVAL: '/approvals/policies', TEMPLATE: '/templates', CUSTOM_FIELDS: '/custom-fields', NOTIFICATION: '/notification-rules' };
export const actions: ApprovalAction[] = ['INVOICE_ISSUE', 'INVOICE_VOID', 'CREDIT_NOTE_ISSUE', 'ORDER_CONFIRM', 'STOCK_ADJUST', 'QUOTATION_SEND'];
export const triggers: Trigger[] = ['invoice.issued', 'invoice.voided', 'credit-note.issued', 'order.confirmed', 'stock.adjusted', 'quotation.sent'];
export const triggerEntities: Record<Trigger, string> = { 'invoice.issued': 'INVOICE', 'invoice.voided': 'INVOICE', 'credit-note.issued': 'INVOICE', 'order.confirmed': 'SALES_ORDER', 'stock.adjusted': 'STOCK_OPERATION', 'quotation.sent': 'QUOTATION' };
export function initialDefinition(kind: DefinitionKind): Definition {
  if (kind === 'APPROVAL') return { enabled: true, action: 'INVOICE_ISSUE', expiresAfterHours: 48, authority: 'OTHER_FIRM_ADMIN' };
  if (kind === 'TEMPLATE') return { enabled: true, entity: 'QUOTATION', heading: '{{businessName}}', footer: 'Thank you for your business.', primaryColour: '#168A56' };
  if (kind === 'CUSTOM_FIELDS') return { enabled: true, entity: 'COMPANY', fields: [] };
  return { enabled: true, name: 'New notification', trigger: 'invoice.issued', delayMinutes: 0, expiresAfterMinutes: 1440, entry: 'notify', steps: [{ id: 'notify', type: 'NOTIFY', title: '{{documentNumber}}', body: '{{entityType}} is {{status}}.', recipientIds: [], next: 'finish' }, { id: 'finish', type: 'STOP' }] };
}
export function definitionKey(definition: Definition, workflowKey: string) {
  return 'action' in definition ? definition.action : 'entity' in definition ? definition.entity : workflowKey;
}
