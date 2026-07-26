export type AddressType = 'BILLING' | 'SHIPPING' | 'OTHER';
export type QuotationStatus = 'DRAFT' | 'PENDING' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type CompanyContact = {
  id: number;
  name: string;
  designation: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanyAddress = {
  id: number;
  addressType: AddressType;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompanyListItem = {
  id: number;
  companyCode: string;
  name: string;
  legalName: string | null;
  gstin: string | null;
  pan: string | null;
  website: string | null;
  isActive: boolean;
  primaryContact: CompanyContact | null;
  primaryBillingAddress: CompanyAddress | null;
  primaryShippingAddress: CompanyAddress | null;
  quotationCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CompanyDetail = CompanyListItem & {
  notes: string | null;
  contacts: CompanyContact[];
  addresses: CompanyAddress[];
  quotationSummary: {
    total: number;
    draft: number;
    pending: number;
    completed: number;
  };
};

export type CompanyQuotation = {
  id: number;
  quotationNumber: string;
  revisionNumber: number;
  quotationDate: string;
  validUntil: string | null;
  status: QuotationStatus;
  currency: string;
  grandTotal: string;
  createdAt: string;
};

export type CompanyListParams = {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
  sortBy: 'companyCode' | 'name' | 'createdAt' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
};

export type QuotationHistoryParams = {
  page: number;
  limit: number;
  status?: QuotationStatus;
  dateFrom?: string;
  dateTo?: string;
  sortOrder: 'asc' | 'desc';
};

export type CompanyListResponse = {
  companies: CompanyListItem[];
  pagination: Pagination;
};

export type CompanyQuotationHistoryResponse = {
  quotations: CompanyQuotation[];
  pagination: Pagination;
};
