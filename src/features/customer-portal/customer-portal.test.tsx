import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerPortalPage } from './CustomerPortalPage';
import * as api from './portal.api';

vi.mock('./portal.api');
const document: api.SharedDocument = { id: 82, snapshotHash: 'a'.repeat(64), canDecide: true, consent: 'I am authorized to decide for the company.', evidence: null, snapshot: { kind: 'QUOTATION', quotationNumber: 'Q-12', revisionNumber: 3, companyName: 'Buyer', currency: 'INR', grandTotal: '100.00', items: [{ itemName: 'Service', quantity: '1', unitRate: '100.00', lineTotal: '100.00' }] } };
beforeEach(() => {
  vi.clearAllMocks(); window.history.replaceState(null, '', `/customer-portal#invite=${'a'.repeat(43)}`);
  vi.mocked(api.openPortalSession).mockResolvedValue(); vi.mocked(api.listSharedDocuments).mockResolvedValue({ contactName: 'Buyer contact', documents: [{ id: 82, kind: 'QUOTATION', number: 'Q-12', revisionNumber: 3 }], page: 1, hasMore: false, consent: document.consent });
  vi.mocked(api.getSharedDocument).mockResolvedValue(structuredClone(document));
});
describe('customer portal revision decisions', () => {
  it('removes the invitation from the URL and requires consent before sending exact-revision proof', async () => {
    render(<CustomerPortalPage />); await userEvent.click(await screen.findByRole('button', { name: 'QUOTATION Q-12 · Revision 3' }));
    expect(window.location.hash).toBe(''); expect(await screen.findByText('Quotation revision 3')).toBeInTheDocument();
    const approve = screen.getByRole('button', { name: 'Approve quotation revision' }); expect(approve).toBeDisabled();
    await userEvent.click(screen.getByLabelText(document.consent)); await userEvent.click(approve);
    await waitFor(() => expect(api.decideSharedQuotation).toHaveBeenCalledWith(expect.objectContaining({ id: 82, snapshotHash: document.snapshotHash }), 'ACCEPTED', expect.any(String)));
  });
  it('hides decisions for a document granted read-only access', async () => {
    vi.mocked(api.getSharedDocument).mockResolvedValue({ ...document, canDecide: false }); render(<CustomerPortalPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'QUOTATION Q-12 · Revision 3' })); await screen.findByText('Quotation revision 3');
    expect(screen.queryByRole('button', { name: 'Approve quotation revision' })).not.toBeInTheDocument(); expect(api.decideSharedQuotation).not.toHaveBeenCalled();
  });
});
