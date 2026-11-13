const statusLabels: Record<string, string> = {
  ACCESS_DENIED: 'Not enabled for your account', NOT_IMPLEMENTED: 'Not available yet',
  NOT_CONFIGURED: 'Not set up', CONFIGURED_NOT_VERIFIED: 'Set up; verification pending',
  VOID: 'Cancelled', CLAIMED: 'Processing', ENQUEUED: 'Queued', GENERATED: 'File generated', POSTED: 'Confirmed', FULFILLED: 'Completed', PARTIALLY_FULFILLED: 'Partially completed',
  PARTIALLY_RECEIVED: 'Partially received', REVOKED: 'Access removed', SUCCEEDED: 'Completed',
  DEAD: 'Needs attention', DEAD_LETTER: 'Needs attention', COMPENSATED: 'Import undone', REVERSED: 'Cancelled',
  LLM_DISABLED_BY_FIRM_ADMIN: 'Connected ChatGPT is turned off by your administrator',
  LOCAL_ACCESS_DENIED: 'Local assistant access is unavailable', LLM_ACCESS_DENIED: 'Connected assistant access is unavailable',
  FIRM_AI_QUOTA_REACHED: 'Your firm has used its connected request allowance', FIRM_DAILY_LIMIT_REACHED: 'Your firm has reached its daily request limit',
  COMMERCIAL_INTEGRATION_REQUIRED: 'ChatGPT connection is not available yet', NOT_CONNECTED: 'ChatGPT is not connected',
  RECONNECT_REQUIRED: 'Your ChatGPT connection needs attention', USAGE_LIMIT_REACHED: 'Your connected account has reached its usage limit',
};

// Translate presentation only. Requests, audit history and saved status codes
// retain the exact domain values expected by the server.
export function formatRecordStatus(status: string) {
  if (Object.prototype.hasOwnProperty.call(statusLabels, status)) return statusLabels[status];
  const words = status.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const stockEvents: Record<string, string> = {
  ADJUSTMENT: 'Stock adjustment', TRANSFER_IN: 'Transfer received', TRANSFER_OUT: 'Transfer sent',
  RECEIVE: 'Goods received', SUPPLIER_RETURN: 'Returned to supplier', CUSTOMER_RETURN: 'Customer return',
  DISPATCH: 'Goods dispatched', DISPATCH_REVERSAL: 'Dispatch cancelled',
  CONSUME: 'Components used', PRODUCE: 'Finished goods received',
  CONSUME_REVERSAL: 'Components restored', PRODUCE_REVERSAL: 'Finished goods removed',
};

export function formatStockEvent(event: string) { return Object.prototype.hasOwnProperty.call(stockEvents, event) ? stockEvents[event] : formatRecordStatus(event); }

const businessActions: Record<string, string> = {
  FEATURE_SWITCH: 'Feature availability changed', PLAN_CREATED: 'Plan created', PLAN_UPDATED: 'Plan updated',
  PLAN_DRAFT_SAVED: 'Plan draft saved', PLAN_DRAFT_DELETED: 'Plan draft deleted', PLAN_PUBLISHED: 'Plan published', PLAN_ARCHIVED: 'Plan archived',
  SUBSCRIPTION_ASSIGNED: 'Subscription assigned', SCHEDULED_SUBSCRIPTION_CANCELLED: 'Scheduled subscription cancelled',
  OVERRIDE_CREATED: 'Access exception added', OVERRIDE_REVOKED: 'Access exception removed', USAGE_RECONCILED: 'Usage totals checked',
  MANUAL_CHARGE_CREATED: 'Manual charge recorded', MANUAL_PAYMENT_RECORDED: 'Manual payment recorded',
  INVOICE_ISSUE: 'Issue invoice', INVOICE_VOID: 'Cancel invoice', CREDIT_NOTE_ISSUE: 'Issue credit note',
  ORDER_CONFIRM: 'Create sales order', STOCK_ADJUST: 'Adjust stock', QUOTATION_SEND: 'Send quotation',
  'invoice.issued': 'Invoice issued', 'invoice.voided': 'Invoice cancelled', 'credit-note.issued': 'Credit note issued',
  'order.confirmed': 'Sales order confirmed', 'stock.adjusted': 'Stock adjusted', 'quotation.sent': 'Quotation sent',
};

export function formatBusinessAction(action: string, status?: string) {
  if (action === 'QUOTATION_SEND' && status) return status === 'SENT' ? 'Mark quotation as sent' : status === 'ACCEPTED' ? 'Record quotation acceptance' : `Change quotation status to ${formatRecordStatus(status).toLowerCase()}`;
  return Object.prototype.hasOwnProperty.call(businessActions, action) ? businessActions[action] : formatRecordStatus(action);
}

const fieldLabels: Record<string, string> = {
  hardDisabled: 'Unavailable for all firms', featureKey: 'Feature', planVersionId: 'Plan revision number',
  sha256: 'File verification code', mappingHash: 'Account mapping verification code', decision: 'Outcome',
  sourceEventId: 'Source event number', schemaVersion: 'Export format version', mappingVersion: 'Account mapping version',
  dateFrom: 'From date', dateTo: 'Through date', bytes: 'File size (bytes)', kind: 'Activity type',
  entity: 'Record type', entityId: 'Record number', documentNumber: 'Document number', itemName: 'Item',
  status: 'Status', total: 'Total', currency: 'Currency', version: 'Version', revision: 'Revision',
  expectedVersion: 'Record version', confirmedTotal: 'Reviewed total', notReportedAndSupplyCancelled: 'Supply cancelled and not reported',
  updatedAt: 'Last updated', itemUpdatedAt: 'Item last updated', policyVersion: 'Business settings version',
  discountPercent: 'Discount (%)', discountBase: 'Amount before discount', discountAmount: 'Discount amount',
  onHand: 'Stock on hand', reserved: 'Reserved stock', inventoryValue: 'Inventory value',
  lastMovementId: 'Last stock entry number', warehouse: 'Warehouse', unit: 'Unit', creates: 'New record',
};

export function formatRecordField(field: string): string {
  return Object.prototype.hasOwnProperty.call(fieldLabels, field) ? fieldLabels[field] : formatRecordStatus(field.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
}

export function formatRecordValue(value: unknown, field = ''): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return Object.entries(value).map(([key, entry]) => `${formatRecordField(key)}: ${formatRecordValue(entry, key)}`).join(', ');
  if (['status', 'entity', 'creates', 'decision'].includes(field)) return formatRecordStatus(String(value));
  if (field.endsWith('At') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))) return new Date(value).toLocaleString();
  if (field === 'discountPercent' && /^-?\d+\.\d+$/.test(String(value))) return String(value).replace(/0+$/, '').replace(/\.$/, '');
  return String(value);
}
