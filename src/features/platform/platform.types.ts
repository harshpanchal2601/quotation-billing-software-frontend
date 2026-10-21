export type FirmStatus = 'ACTIVE' | 'SUSPENDED';

export type PlatformFirm = {
  id: number;
  name: string;
  slug: string;
  status: FirmStatus;
  userLimit: number;
  userCount: number;
  displayName: string;
  primaryEmail: string | null;
  administratorEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateFirmInput = {
  name: string;
  slug: string;
  legalName: string;
  displayName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  primaryEmail: string;
  primaryPhone?: string;
  quotationPrefix?: string;
  adminName: string;
  adminEmail: string;
  adminUsername: string;
  temporaryPassword: string;
};
