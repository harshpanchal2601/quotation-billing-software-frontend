import { AxiosError, AxiosHeaders } from 'axios';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, toApiError, type ApiErrorResponse } from '@shared/api/apiClient';
import { getPreferences, performApprovedAction, savePreferences } from './api/automation.api';
import { ApprovalRequestBridge } from './components/ApprovalRequestBridge';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function approvalError(url = '/invoices/11/issue') {
  const command = { action: 'INVOICE_ISSUE', entityId: 11, expectedVersion: 1, confirmedTotal: '80' };
  const config = { url, firmContextRevision: 4, headers: new AxiosHeaders() };
  return new AxiosError<ApiErrorResponse>('Approval required', 'ERR_BAD_REQUEST', config, undefined, {
    status: 409, statusText: 'Conflict', headers: new AxiosHeaders(), config,
    data: { success: false, message: 'Approval required', errors: { code: 'APPROVAL_REQUIRED', command } },
  });
}
function mountBridge() {
  let rejectResponse!: (error: unknown) => Promise<never>;
  vi.spyOn(apiClient.interceptors.response, 'use').mockImplementation((_fulfilled, rejected) => {
    rejectResponse = (error) => rejected!(error) as Promise<never>;
    return 81;
  });
  const eject = vi.spyOn(apiClient.interceptors.response, 'eject');
  const view = render(<ApprovalRequestBridge />);
  return { rejectResponse, eject, view };
}
describe('Wave 08 approval request transport boundary', () => {
  it('retains the requested quotation target status rather than changing the approved action', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ data: {} });
    await performApprovedAction({ action: 'QUOTATION_SEND', entityId: 12, status: 'ACCEPTED', comment: 'Customer acceptance recorded' });
    expect(patch).toHaveBeenCalledWith('/quotations/12/status', { status: 'ACCEPTED', comment: 'Customer acceptance recorded' });
  });
  it('requires an email approval to be performed from the existing quotation email form', async () => {
    const patch = vi.spyOn(apiClient, 'patch');
    await expect(performApprovedAction({ action: 'QUOTATION_SEND', entityId: 12 })).rejects.toThrow('quotation page');
    expect(patch).not.toHaveBeenCalled();
  });
  it('preserves the existing cancellation confirmation when performing an approved invoice void', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } });
    await performApprovedAction({ action: 'INVOICE_VOID', entityId: 11, expectedVersion: 2, reason: 'Confirmed same-day cancellation', notReportedAndSupplyCancelled: true });
    expect(post).toHaveBeenCalledWith('/invoices/11/void', { expectedVersion: 2, reason: 'Confirmed same-day cancellation', notReportedAndSupplyCancelled: true });
  });
  it('creates only a review request and retains the original firm context', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { success: true, data: {} } });
    const { rejectResponse, eject, view } = mountBridge();
    const error = approvalError();
    await expect(rejectResponse(error)).rejects.toBe(error);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/approvals', expect.objectContaining({ action: 'INVOICE_ISSUE', entityId: 11 }), { firmContextRevision: 4 });
    expect(error.response?.data.message).toContain('Approval requested.');
    expect(toApiError(error).approvalRequested).toBe(true);
    view.unmount(); expect(eject).toHaveBeenCalledWith(81);
  });
  it('never recursively requests approval or handles unrelated conflicts', async () => {
    const post = vi.spyOn(apiClient, 'post'); const { rejectResponse } = mountBridge();
    const recursive = approvalError('/approvals');
    await expect(rejectResponse(recursive)).rejects.toBe(recursive);
    const unrelated = approvalError(); unrelated.response!.data.errors = { code: 'VERSION_CONFLICT' };
    await expect(rejectResponse(unrelated)).rejects.toBe(unrelated);
    expect(post).not.toHaveBeenCalled();
  });
  it('propagates request failure without reporting that approval was requested', async () => {
    const failure = new Error('Review request failed');
    vi.spyOn(apiClient, 'post').mockRejectedValue(failure); const { rejectResponse } = mountBridge();
    const error = approvalError();
    await expect(rejectResponse(error)).rejects.toBe(failure);
    expect(error.response?.data.message).toBe('Approval required');
    expect(toApiError(error).approvalRequested).toBe(false);
  });
});
describe('Wave 08 notification preference payloads', () => {
  it('keeps server identity fields out of the strict preference update contract', async () => {
    const preference = { enabled: true, utcOffsetMinutes: 330, quietStartMinute: 1320, quietEndMinute: 420 };
    const server = { ...preference, id: 5, firmId: 1, userId: 10, updatedAt: '2026-11-08T00:00:00Z' };
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: { preference: server } } });
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { success: true, data: { preference: server } } });
    expect(await getPreferences()).toEqual(preference);
    expect(await savePreferences(server)).toEqual(preference);
    expect(put).toHaveBeenCalledWith('/automation/preferences', preference);
  });
});
