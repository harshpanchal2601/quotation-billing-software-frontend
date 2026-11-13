import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as attachmentsApi from './attachments/api/quotation-attachments.api';
import { QuotationAttachmentsSection } from './attachments/components/QuotationAttachmentsSection';
import type { QuotationAttachmentListResponse } from './attachments/model/quotation-attachments.types';
import { formatFileSize } from './attachments/model/quotation-attachments.utils';

vi.mock('./attachments/api/quotation-attachments.api');

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
}

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockAttachmentListResponse: QuotationAttachmentListResponse = {
  attachments: [
    {
      id: 1,
      quotationId: 1,
      originalFilename: 'layout-drawing.pdf',
      mimeType: 'application/pdf',
      fileSize: 1048576, // 1.0 MB
      fileCategory: 'PDF',
      canPreview: true,
      uploadedAt: '2026-07-26T10:00:00.000Z',
      uploadedBy: { id: 1, name: 'Admin User' },
    },
    {
      id: 2,
      quotationId: 1,
      originalFilename: 'technical-specs.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 524288, // 512.0 KB
      fileCategory: 'Word document',
      canPreview: false,
      uploadedAt: '2026-07-26T11:00:00.000Z',
      uploadedBy: { id: 1, name: 'Admin User' },
    },
  ],
  limits: {
    maximumAttachments: 20,
    remainingAttachments: 18,
    maximumFileSizeBytes: 20971520,
  },
};

describe('Quotation Attachments Frontend Component', () => {
  const mockOnFeedback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(attachmentsApi.getQuotationAttachmentsRequest).mockResolvedValue(mockAttachmentListResponse);
  });

  it('does not show the empty attachment state before the first request completes', () => {
    const pendingAttachments = deferred<QuotationAttachmentListResponse>();
    vi.mocked(attachmentsApi.getQuotationAttachmentsRequest).mockReturnValue(pendingAttachments.promise);

    renderWithProviders(<QuotationAttachmentsSection quotationId={1} onFeedback={mockOnFeedback} />);

    expect(screen.getByText(/Supporting Attachments/i)).toBeInTheDocument();
    expect(screen.queryByText(/No supporting attachments uploaded/i)).not.toBeInTheDocument();
  });

  it('renders attachment section and lists uploaded documents with size formatting', async () => {
    renderWithProviders(<QuotationAttachmentsSection quotationId={1} onFeedback={mockOnFeedback} />);

    expect(screen.getByText(/Supporting Attachments/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('layout-drawing.pdf')[0]).toBeInTheDocument();
      expect(screen.getAllByText('technical-specs.docx')[0]).toBeInTheDocument();
    });

    expect(formatFileSize(1048576)).toBe('1.0 MB');
    expect(formatFileSize(524288)).toBe('512.0 KB');
    expect(screen.getByText('2/20')).toBeInTheDocument();
  });

  it('distinguishes preview availability for PDF vs Office document', async () => {
    renderWithProviders(<QuotationAttachmentsSection quotationId={1} onFeedback={mockOnFeedback} />);

    await waitFor(() => {
      expect(screen.getAllByText('layout-drawing.pdf')[0]).toBeInTheDocument();
    });

    const pdfPreviewBtn = screen.getByRole('button', { name: 'Preview layout-drawing.pdf' });
    expect(pdfPreviewBtn).not.toBeDisabled();

    const docxPreviewBtn = screen.getByRole('button', { name: 'Preview unavailable for technical-specs.docx' });
    expect(docxPreviewBtn).toBeDisabled();
  });

  it('opens delete confirmation dialog when delete action is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuotationAttachmentsSection quotationId={1} onFeedback={mockOnFeedback} />);

    await waitFor(() => {
      expect(screen.getAllByText('layout-drawing.pdf')[0]).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: 'Delete layout-drawing.pdf' });
    await user.click(deleteBtn);

    expect(screen.getByText(/Delete Attachment\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument();
  });

  it('prevents overlapping downloads while keeping the active file identifiable', async () => {
    const pendingDownload = deferred<{ blob: Blob; filename: string }>();
    vi.mocked(attachmentsApi.downloadQuotationAttachmentBlobRequest).mockReturnValue(pendingDownload.promise);

    const user = userEvent.setup();
    renderWithProviders(<QuotationAttachmentsSection quotationId={1} onFeedback={mockOnFeedback} />);

    await screen.findAllByText('layout-drawing.pdf');
    const downloadButtons = screen.getAllByRole('button', { name: /download/i });
    await user.click(downloadButtons[0]!);

    expect(screen.getByRole('button', { name: 'Download layout-drawing.pdf' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download technical-specs.docx' })).toBeDisabled();
    expect(attachmentsApi.downloadQuotationAttachmentBlobRequest).toHaveBeenCalledTimes(1);
  });
  it('prevents repeated upload submissions, blocks closing in flight, then closes and resets after success', async () => {
    const pendingUpload = deferred<QuotationAttachmentListResponse['attachments'][number]>();
    vi.mocked(attachmentsApi.uploadQuotationAttachmentRequest).mockReturnValue(pendingUpload.promise);
    const user = userEvent.setup();
    renderWithProviders(<QuotationAttachmentsSection quotationId={1} onFeedback={mockOnFeedback} />);
    await screen.findAllByText('layout-drawing.pdf');
    await user.click(screen.getByRole('button', { name: 'Upload attachment' }));
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(fileInput, new File(['QA supporting document'], 'qa-upload.txt', { type: 'text/plain' }));
    await user.dblClick(screen.getByRole('button', { name: 'Upload Attachment' }));
    expect(attachmentsApi.uploadQuotationAttachmentRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('heading', { name: 'Upload Quotation Attachment' })).toBeInTheDocument();
    pendingUpload.resolve({ ...mockAttachmentListResponse.attachments[0]!, originalFilename: 'qa-upload.txt' });
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Upload Quotation Attachment' })).not.toBeInTheDocument());
    expect(mockOnFeedback).toHaveBeenCalledWith('Uploaded "qa-upload.txt" successfully', 'success');
    await user.click(screen.getByRole('button', { name: 'Upload attachment' }));
    expect(screen.getByRole('button', { name: 'Upload Attachment' })).toBeDisabled();
    expect(document.querySelector<HTMLInputElement>('input[type="file"]')?.value).toBe('');
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
