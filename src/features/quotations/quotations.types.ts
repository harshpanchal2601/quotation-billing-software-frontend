export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'CANCELLED';

export type TaxMode = 'CGST_SGST' | 'IGST' | 'NONE';

export type DiscountType = 'NONE' | 'PERCENTAGE' | 'FIXED';

export type UserSummary = {
  id: number;
  name: string;
  email: string;
};

export type CompanySummary = {
  id: number;
  companyCode: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
};

export type AddressSnapshot = {
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type QuotationListItem = {
  id: number;
  quotationNumber: string;
  revisionNumber: number;
  companyId: number;
  company: CompanySummary | null;
  companyNameSnapshot: string;
  companyGstinSnapshot: string | null;
  quotationDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  currency: string;
  itemCount: number;
  subtotal: string;
  grandTotal: string;
  createdBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type QuotationLineItem = {
  id: number;
  quotationId: number;
  itemId: number | null;
  lineNumber: number;
  itemCodeSnapshot: string | null;
  itemNameSnapshot: string;
  descriptionSnapshot: string | null;
  specificationsSnapshot: unknown;
  measurementUnitSnapshot: string;
  quantity: string;
  unitRate: string;
  discountType: DiscountType;
  discountValue: string;
  discountAmount: string;
  gstRate: string;
  baseAmount: string;
  taxableAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type QuotationStatusHistoryItem = {
  id: number;
  fromStatus: QuotationStatus | null;
  toStatus: QuotationStatus;
  comment: string | null;
  changedBy: UserSummary | null;
  changedAt: string;
};

export type QuotationDetail = {
  id: number;
  quotationNumber: string;
  revisionNumber: number;
  companyId: number;
  companyContactId: number | null;
  billingAddressId: number | null;
  shippingAddressId: number | null;
  company: CompanySummary | null;
  companyNameSnapshot: string;
  companyGstinSnapshot: string | null;
  companyPanSnapshot: string | null;
  contactNameSnapshot: string | null;
  contactEmailSnapshot: string | null;
  contactPhoneSnapshot: string | null;
  billingAddressSnapshot: AddressSnapshot | null;
  shippingAddressSnapshot: AddressSnapshot | null;
  quotationDate: string;
  validUntil: string | null;
  customerReference: string | null;
  internalReference: string | null;
  status: QuotationStatus;
  currency: string;
  taxMode: TaxMode;
  subtotal: string;
  itemDiscountAmount: string;
  quotationDiscountType: DiscountType;
  quotationDiscountValue: string;
  quotationDiscountAmount: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  freightAmount: string;
  freightIncluded: boolean;
  freightIsTaxable: boolean;
  otherCharges: string;
  roundOffAmount: string;
  grandTotal: string;
  amountInWords: string | null;
  deliveryTerms: string | null;
  dispatchTerms: string | null;
  paymentTerms: string | null;
  taxTerms: string | null;
  freightTerms: string | null;
  warrantyTerms: string | null;
  remarks: string | null;
  termsAndConditions: string | null;
  internalNotes: string | null;
  sentAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  completedAt: string | null;
  createdBy: UserSummary | null;
  updatedBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  items: QuotationLineItem[];
  statusHistory: QuotationStatusHistoryItem[];
};

export type QuotationItemInput = {
  itemId?: number | null;
  lineNumber?: number;
  itemName?: string;
  description?: string | null;
  specifications?: unknown;
  measurementUnit?: string;
  quantity: number | string;
  unitRate: number | string;
  discountType?: DiscountType;
  discountValue?: number | string;
  gstRate?: number | string;
  sortOrder?: number;
};

export type CalculationPreviewInput = {
  taxMode?: TaxMode;
  quotationDiscountType?: DiscountType;
  quotationDiscountValue?: number | string;
  freightAmount?: number | string;
  otherCharges?: number | string;
  items: QuotationItemInput[];
};

export type CalculatedLineItem = {
  lineNumber: number;
  itemId: number | null;
  itemCodeSnapshot: string | null;
  itemNameSnapshot: string;
  descriptionSnapshot: string | null;
  specificationsSnapshot: unknown;
  measurementUnitSnapshot: string;
  quantity: string;
  unitRate: string;
  discountType: DiscountType;
  discountValue: string;
  discountAmount: string;
  baseAmount: string;
  taxableAmount: string;
  gstRate: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  taxAmount: string;
  lineTotal: string;
  sortOrder: number;
};

export type CalculatedQuotationTotals = {
  subtotal: string;
  itemDiscountAmount: string;
  quotationDiscountType: DiscountType;
  quotationDiscountValue: string;
  quotationDiscountAmount: string;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  freightAmount: string;
  otherCharges: string;
  roundOffAmount: string;
  grandTotal: string;
  amountInWords: string;
  items: CalculatedLineItem[];
};

export type QuotationCreateInput = {
  companyId: number;
  companyContactId?: number | null;
  billingAddressId?: number | null;
  shippingAddressId?: number | null;
  quotationDate: string;
  validUntil?: string | null;
  customerReference?: string | null;
  internalReference?: string | null;
  currency?: string;
  taxMode?: TaxMode;
  quotationDiscountType?: DiscountType;
  quotationDiscountValue?: number | string;
  freightAmount?: number | string;
  otherCharges?: number | string;
  deliveryTerms?: string | null;
  dispatchTerms?: string | null;
  paymentTerms?: string | null;
  taxTerms?: string | null;
  freightTerms?: string | null;
  warrantyTerms?: string | null;
  remarks?: string | null;
  termsAndConditions?: string | null;
  internalNotes?: string | null;
  items: QuotationItemInput[];
};

export type QuotationUpdateInput = Partial<QuotationCreateInput>;

export type QuotationListParams = {
  page?: number;
  limit?: number;
  search?: string;
  companyId?: number;
  status?: QuotationStatus;
  dateFrom?: string;
  dateTo?: string;
  validFrom?: string;
  validTo?: string;
  minTotal?: number;
  maxTotal?: number;
  sortBy?: 'quotationNumber' | 'quotationDate' | 'validUntil' | 'grandTotal' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type QuotationListResponse = {
  quotations: QuotationListItem[];
  pagination: PaginationMeta;
};

export type QuotationStatusUpdateInput = {
  status: QuotationStatus;
  comment?: string | null;
};
