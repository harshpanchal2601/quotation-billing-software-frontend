export type BusinessProfile = {
  id: number;
  legalName: string;
  displayName: string;
  gstin: string | null;
  pan: string | null;
  cin: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  website: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  stampUrl: string | null;
  primaryColour: string;
  secondaryColour: string;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
};

export type SequenceResetRule = 'FINANCIAL_YEAR' | 'CALENDAR_YEAR' | 'NEVER';
export type TaxMode = 'CGST_SGST' | 'IGST' | 'NONE';

export type QuotationSettings = {
  id: number;
  businessProfileId: number;
  quotationPrefix: string;
  financialYearFormat: 'YYYY-YY';
  nextSequenceNumber: number;
  sequenceResetRule: SequenceResetRule;
  defaultValidityDays: number;
  defaultTaxMode: TaxMode;
  defaultGstRate: string;
  defaultDeliveryTerms: string | null;
  defaultDispatchTerms: string | null;
  defaultPaymentTerms: string | null;
  defaultFreightTerms: string | null;
  defaultWarrantyTerms: string | null;
  defaultRemarks: string | null;
  defaultTermsAndConditions: string | null;
  showBankDetails: boolean;
  showAmountInWords: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BankDetail = {
  id: number;
  bankName: string;
  accountName: string;
  accountNumber: string;
  accountType: string | null;
  ifscCode: string | null;
  branchName: string | null;
  swiftCode: string | null;
  upiId: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandingAssetType = 'logo' | 'signature' | 'stamp';
