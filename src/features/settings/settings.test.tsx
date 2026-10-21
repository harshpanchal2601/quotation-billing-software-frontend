import { QueryClient } from '@tanstack/react-query';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@shared/test/render';
import { businessProfileSchema } from './model/business-profile.schema';
import { bankDetailsSchema } from './model/bank-details.schema';
import { quotationSettingsSchema } from './model/quotation-settings.schema';
import { BusinessSettingsPage } from './pages/BusinessSettingsPage';
import { QuotationSettingsPage } from './pages/QuotationSettingsPage';
import { BankDetailsPage } from './pages/BankDetailsPage';
import { maskAccountNumber, resolveAssetUrl } from './model/settings.utils';
import type { BankDetail, BusinessProfile, QuotationSettings } from './model/settings.types';

const businessApi = vi.hoisted(() => ({
  getBusinessProfileRequest: vi.fn(),
  updateBusinessProfileRequest: vi.fn(),
  uploadBrandingAssetRequest: vi.fn(),
  deleteBrandingAssetRequest: vi.fn(),
}));

const quotationApi = vi.hoisted(() => ({
  getQuotationSettingsRequest: vi.fn(),
  updateQuotationSettingsRequest: vi.fn(),
}));

const bankApi = vi.hoisted(() => ({
  listBankDetailsRequest: vi.fn(),
  createBankDetailRequest: vi.fn(),
  updateBankDetailRequest: vi.fn(),
  deleteBankDetailRequest: vi.fn(),
  setDefaultBankDetailRequest: vi.fn(),
}));

vi.mock('./api/business-profile.api', async () => ({
  businessProfileQueryKey: ['settings', 'business-profile'],
  ...businessApi,
}));

vi.mock('./api/quotation-settings.api', async () => ({
  quotationSettingsQueryKey: ['settings', 'quotation'],
  ...quotationApi,
}));

vi.mock('./api/bank-details.api', async () => ({
  bankDetailsQueryKey: ['settings', 'bank-details'],
  ...bankApi,
}));

const objectUrl = 'blob:test-preview';

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => objectUrl),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('settings validation and utilities', () => {
  it('validates profile identifiers, colours and asset URLs safely', () => {
    expect(businessProfileSchema.safeParse({ ...businessProfileFormValues(), gstin: 'invalid' }).success).toBe(false);
    expect(businessProfileSchema.safeParse({ ...businessProfileFormValues(), pan: 'invalid' }).success).toBe(false);
    expect(businessProfileSchema.safeParse({ ...businessProfileFormValues(), primaryColour: '#12345G' }).success).toBe(false);
    expect(resolveAssetUrl('/storage/logos/logo.png')).toMatch(/\/storage\/logos\/logo\.png$/);
    expect(resolveAssetUrl('storage/items/item.png')).toMatch(/\/storage\/items\/item\.png$/);
    expect(resolveAssetUrl('/storage/storage/items/item.png')).toMatch(/\/storage\/items\/item\.png$/);
    expect(resolveAssetUrl('http://localhost:3004/storage/logos/logo.png?size=small', '2026-01-01')).toBe('http://localhost:3004/storage/logos/logo.png?size=small&v=2026-01-01');
    expect(resolveAssetUrl(null)).toBeNull();
  });

  it('keeps decimal strings and validates quotation ranges', () => {
    expect(quotationSettingsSchema.parse(quotationFormValues()).defaultGstRate).toBe('18.00');
    expect(quotationSettingsSchema.safeParse({ ...quotationFormValues(), nextSequenceNumber: 0 }).success).toBe(false);
    expect(quotationSettingsSchema.safeParse({ ...quotationFormValues(), defaultValidityDays: 366 }).success).toBe(false);
    expect(quotationSettingsSchema.safeParse({ ...quotationFormValues(), defaultGstRate: '100.01' }).success).toBe(false);
  });

  it('preserves bank account strings and masks list values', () => {
    const parsed = bankDetailsSchema.parse({ ...bankFormValues(), accountNumber: '001234567890' });
    expect(parsed.accountNumber).toBe('001234567890');
    expect(maskAccountNumber(parsed.accountNumber)).toBe('••••••••7890');
    expect(maskAccountNumber('1234')).toBe('••••1234');
    expect(bankDetailsSchema.parse({ ...bankFormValues(), ifscCode: ' barb0ahmeda ' }).ifscCode).toBe('BARB0AHMEDA');
    expect(bankDetailsSchema.parse({ ...bankFormValues(), ifscCode: '' }).ifscCode).toBeUndefined();
    const invalidIfsc = bankDetailsSchema.safeParse({ ...bankFormValues(), ifscCode: 'BAD' });
    expect(invalidIfsc.success).toBe(false);
    if (!invalidIfsc.success) {
      expect(invalidIfsc.error.issues[0]?.message).toBe('Enter a valid 11-character IFSC code, for example BARB0AHMEDA.');
    }
  });
});

describe('BusinessSettingsPage', () => {
  it('renders one page H1 without duplicated internal settings tabs', async () => {
    businessApi.getBusinessProfileRequest.mockResolvedValue(businessProfile());
    renderSettings(<BusinessSettingsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Business Settings' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('tablist', { name: /settings sections/i })).not.toBeInTheDocument();
  });

  it('loads server values, disables unchanged save and resets edits', async () => {
    businessApi.getBusinessProfileRequest.mockResolvedValue(businessProfile());
    renderSettings(<BusinessSettingsPage />);

    expect(screen.getByText('Business Settings')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('BUMINEX PHARMTECH SOLUTIONS PRIVATE LIMITED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/display name/i));
    await userEvent.type(screen.getByLabelText(/display name/i), 'Changed Name');
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /reset changes/i }));
    expect(screen.getByDisplayValue('Buminex Pharmtech Solutions Pvt. Ltd.')).toBeInTheDocument();
  });

  it('updates profile and refreshes branding assets', async () => {
    const profile = businessProfile();
    businessApi.getBusinessProfileRequest.mockResolvedValue(profile);
    businessApi.updateBusinessProfileRequest.mockResolvedValue({ ...profile, displayName: 'Updated Name' });
    businessApi.uploadBrandingAssetRequest.mockResolvedValue({ ...profile, logoUrl: '/storage/logos/new.png', updatedAt: '2026-01-02T00:00:00.000Z' });
    businessApi.deleteBrandingAssetRequest.mockResolvedValue({ ...profile, logoUrl: null });
    renderSettings(<BusinessSettingsPage />);

    await screen.findByAltText('Logo preview');

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, new File(['image'], 'logo.png', { type: 'image/png' }));
    await waitFor(() => expect(businessApi.uploadBrandingAssetRequest.mock.calls[0][0]).toBe('logo'));
    expect(businessApi.uploadBrandingAssetRequest.mock.calls[0][1]).toBeInstanceOf(File);

    await userEvent.click(screen.getAllByRole('button', { name: /remove image/i })[0]);
    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(businessApi.deleteBrandingAssetRequest.mock.calls[0][0]).toBe('logo'));
  });

  it('shows a clean fallback when a persisted branding image fails to load', async () => {
    businessApi.getBusinessProfileRequest.mockResolvedValue(businessProfile());
    renderSettings(<BusinessSettingsPage />);

    const logo = await screen.findByAltText('Logo preview');
    fireEvent.error(logo);

    expect(screen.getByRole('img', { name: /logo image unavailable/i })).toBeInTheDocument();
  });

  it('shows retry on API failure and rejects unsupported branding files', async () => {
    businessApi.getBusinessProfileRequest.mockRejectedValue(new Error('Unable to load settings'));
    renderSettings(<BusinessSettingsPage />);
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();

    cleanup();
    businessApi.getBusinessProfileRequest.mockResolvedValue(businessProfile());
    renderSettings(<BusinessSettingsPage />);
    await screen.findByText('Branding assets');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['bad'], 'logo.svg', { type: 'image/svg+xml' })] } });
    expect(await screen.findByText('Use a JPEG, PNG or WebP image.')).toBeInTheDocument();
  });
});

describe('QuotationSettingsPage', () => {
  it('renders one page H1 without duplicated internal settings tabs', async () => {
    quotationApi.getQuotationSettingsRequest.mockResolvedValue(quotationSettings());
    renderSettings(<QuotationSettingsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Quotation Settings' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('tablist', { name: /settings sections/i })).not.toBeInTheDocument();
  });

  it('loads enum labels, submits decimal strings and preserves line breaks', async () => {
    quotationApi.getQuotationSettingsRequest.mockResolvedValue(quotationSettings());
    quotationApi.updateQuotationSettingsRequest.mockImplementation(async (values) => ({ ...quotationSettings(), ...values }));
    renderSettings(<QuotationSettingsPage />);

    expect(await screen.findByDisplayValue('BUMINEX')).toBeInTheDocument();
    expect(screen.getByText('Financial year')).toBeInTheDocument();
    expect(screen.getByText('CGST + SGST')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    await userEvent.clear(screen.getByLabelText(/default remarks/i));
    await userEvent.type(screen.getByLabelText(/default remarks/i), 'Line one\nLine two');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => expect(quotationApi.updateQuotationSettingsRequest).toHaveBeenCalled());
    expect(quotationApi.updateQuotationSettingsRequest.mock.calls[0][0]).toEqual(expect.objectContaining({
      defaultGstRate: '18.00',
      defaultRemarks: 'Line one\nLine two',
    }));
  });
});

describe('BankDetailsPage', () => {
  it('renders one page H1 without duplicated internal settings tabs', async () => {
    bankApi.listBankDetailsRequest.mockResolvedValue([]);
    renderSettings(<BankDetailsPage />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Bank Details' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole('tablist', { name: /settings sections/i })).not.toBeInTheDocument();
  });

  it('shows empty state, creates accounts and preserves leading zeros', async () => {
    bankApi.listBankDetailsRequest.mockResolvedValue([]);
    bankApi.createBankDetailRequest.mockImplementation(async (values) => ({ id: 2, createdAt: '', updatedAt: '', ...values }));
    renderSettings(<BankDetailsPage />);

    expect(await screen.findByText('No bank accounts yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /add bank account/i }));
    await userEvent.type(screen.getByLabelText(/bank name/i), 'HDFC Bank');
    await userEvent.type(screen.getByLabelText(/account name/i), 'Buminex');
    await userEvent.type(screen.getByLabelText(/account number/i), '001234567890');
    await userEvent.type(screen.getByLabelText(/ifsc code/i), 'HDFC0001234');
    await waitFor(() => expect(screen.getByRole('button', { name: /save account/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    await waitFor(() => expect(bankApi.createBankDetailRequest).toHaveBeenCalled());
    expect(bankApi.createBankDetailRequest.mock.calls[0][0]).toEqual(expect.objectContaining({
      accountNumber: '001234567890',
    }));
    expect(await screen.findByText('Bank account added.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /add bank account/i })).not.toBeInTheDocument());
  });

  it('keeps the bank dialog open and maps API field errors', async () => {
    cleanup();
    bankApi.listBankDetailsRequest.mockResolvedValue([]);
    bankApi.createBankDetailRequest.mockRejectedValue(new axios.AxiosError('Request failed', undefined, undefined, undefined, {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
      data: {
        success: false,
        message: 'Validation failed',
        errors: { fieldErrors: { accountNumber: ['Account number already exists.'] } },
      },
    }));
    renderSettings(<BankDetailsPage />);

    await screen.findByText('No bank accounts yet');
    await userEvent.click(screen.getByRole('button', { name: /add bank account/i }));
    await userEvent.type(screen.getByLabelText(/bank name/i), 'HDFC Bank');
    await userEvent.type(screen.getByLabelText(/account name/i), 'Buminex');
    await userEvent.type(screen.getByLabelText(/account number/i), '001234567890');
    await waitFor(() => expect(screen.getByRole('button', { name: /save account/i })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: /save account/i }));

    expect(await screen.findByText('Validation failed')).toBeInTheDocument();
    expect(await screen.findByText('Account number already exists.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: /add bank account/i })).toBeInTheDocument();
  });

  it('masks account numbers, edits, sets default and deletes with confirmation', async () => {
    cleanup();
    const banks = [bankDetail({ id: 1, isDefault: true }), bankDetail({ id: 2, bankName: 'ICICI Bank', accountNumber: '9876543210' })];
    bankApi.listBankDetailsRequest.mockResolvedValue(banks);
    bankApi.updateBankDetailRequest.mockResolvedValue({ ...banks[1], bankName: 'ICICI Bank Updated' });
    bankApi.setDefaultBankDetailRequest.mockResolvedValue({ ...banks[1], isDefault: true });
    bankApi.deleteBankDetailRequest.mockResolvedValue(undefined);
    renderSettings(<BankDetailsPage />);

    expect(await screen.findByText('••••••7890')).toBeInTheDocument();
    expect(screen.queryByTitle('1234567890')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set hdfc bank as default/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /edit icici bank/i }));
    expect(await screen.findByDisplayValue('9876543210')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /set icici bank as default/i }));
    await waitFor(() => expect(bankApi.setDefaultBankDetailRequest.mock.calls[0][0]).toBe(2));

    await userEvent.click(screen.getByRole('button', { name: /delete icici bank/i }));
    expect(screen.getByText(/this will remove icici bank account/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /delete account/i }));
    await waitFor(() => expect(bankApi.deleteBankDetailRequest.mock.calls[0][0]).toBe(2));
  });
});

function renderSettings(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return renderWithProviders(ui, { queryClient, route: '/settings/business' });
}

function businessProfileFormValues() {
  return {
    legalName: 'BUMINEX PHARMTECH SOLUTIONS PRIVATE LIMITED',
    displayName: 'Buminex Pharmtech Solutions Pvt. Ltd.',
    gstin: '24AAMCB7736K1Z9',
    pan: '',
    cin: '',
    addressLine1: '163 Aadarsh Gold Industrial Estate',
    addressLine2: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    postalCode: '380018',
    country: 'India',
    primaryPhone: '9428355505',
    secondaryPhone: '',
    primaryEmail: '',
    secondaryEmail: '',
    website: 'https://buminexpharmtech.com',
    primaryColour: '#168A56',
    secondaryColour: '#082B67',
    defaultCurrency: 'INR',
  };
}

function businessProfile(): BusinessProfile {
  return {
    id: 1,
    ...businessProfileFormValues(),
    pan: null,
    cin: null,
    addressLine2: null,
    secondaryPhone: null,
    primaryEmail: null,
    secondaryEmail: null,
    logoUrl: '/storage/logos/logo.png',
    signatureUrl: null,
    stampUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function quotationFormValues() {
  return {
    quotationPrefix: 'BUMINEX',
    financialYearFormat: 'YYYY-YY' as const,
    nextSequenceNumber: 1,
    sequenceResetRule: 'FINANCIAL_YEAR' as const,
    defaultValidityDays: 30,
    defaultTaxMode: 'CGST_SGST' as const,
    defaultGstRate: '18.00',
    defaultDeliveryTerms: '20 DAYS',
    defaultDispatchTerms: 'AT YOUR SITE',
    defaultPaymentTerms: '30 DAYS',
    defaultFreightTerms: 'INCLUDING',
    defaultWarrantyTerms: '',
    defaultRemarks: 'We hope you will find our offer competitive.',
    defaultTermsAndConditions: '',
    showBankDetails: true,
    showAmountInWords: true,
  };
}

function quotationSettings(): QuotationSettings {
  return {
    id: 1,
    businessProfileId: 1,
    ...quotationFormValues(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function bankFormValues() {
  return {
    bankName: 'HDFC Bank',
    accountName: 'Buminex',
    accountNumber: '1234567890',
    accountType: '',
    ifscCode: 'HDFC0001234',
    branchName: '',
    swiftCode: '',
    upiId: '',
    isDefault: false,
  };
}

function bankDetail(overrides: Partial<BankDetail> = {}): BankDetail {
  return {
    id: 1,
    bankName: 'HDFC Bank',
    accountName: 'Buminex',
    accountNumber: '1234567890',
    accountType: 'Current',
    ifscCode: 'HDFC0001234',
    branchName: 'Ahmedabad',
    swiftCode: null,
    upiId: null,
    isDefault: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}
