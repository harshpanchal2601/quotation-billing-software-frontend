import { describe, expect, it } from 'vitest';
import { readAssistantDraft } from './assistantDraft';

const state = { source: 'assistant', firmId: 1, actorId: 10, kind: 'INVOICE', companyId: 11, lines: [{ itemId: 7, itemName: 'Reviewed service', quantity: '1.125', unitRate: '900719925474099.001', taxRate: '18', measurementUnit: 'HOUR', supplyType: 'SERVICE', discountType: 'NONE', discountValue: '0' }] };
describe('assistant draft editor handoff', () => {
  it('preserves exact decimal strings for normal editor review', () => {
    expect(readAssistantDraft(state, 1, 10, 'INVOICE')?.lines[0].unitRate).toBe('900719925474099.001');
  });
  it('rejects a different firm, actor, document kind and malformed browser state', () => {
    expect(readAssistantDraft(state, 2, 10, 'INVOICE')).toBeUndefined();
    expect(readAssistantDraft(state, 1, 20, 'INVOICE')).toBeUndefined();
    expect(readAssistantDraft(state, 1, 10, 'QUOTATION')).toBeUndefined();
    expect(readAssistantDraft({ ...state, lines: [{ ...state.lines[0], itemId: -1 }] }, 1, 10, 'INVOICE')).toBeUndefined();
    expect(readAssistantDraft(null, 1, 10, 'INVOICE')).toBeUndefined();
  });
});
