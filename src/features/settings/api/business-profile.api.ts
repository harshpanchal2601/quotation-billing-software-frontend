import { apiClient, type ApiSuccessResponse } from '@shared/api/apiClient';
import type { BrandingAssetType, BusinessProfile } from '../settings.types';

export const businessProfileQueryKey = ['settings', 'business-profile'] as const;

type BusinessProfileResponse = {
  businessProfile: BusinessProfile;
};

export async function getBusinessProfileRequest() {
  const response = await apiClient.get<ApiSuccessResponse<BusinessProfileResponse>>('/settings/business-profile');
  return response.data.data.businessProfile;
}

export type BusinessProfileUpdateRequest = {
  legalName: string;
  displayName: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  primaryEmail?: string;
  secondaryEmail?: string;
  website?: string;
  primaryColour: string;
  secondaryColour: string;
  defaultCurrency: string;
};

export async function updateBusinessProfileRequest(input: BusinessProfileUpdateRequest) {
  const response = await apiClient.put<ApiSuccessResponse<BusinessProfileResponse>>('/settings/business-profile', input);
  return response.data.data.businessProfile;
}

const assetFieldNames: Record<BrandingAssetType, string> = {
  logo: 'logo',
  signature: 'signature',
  stamp: 'stamp',
};

export async function uploadBrandingAssetRequest(assetType: BrandingAssetType, file: File) {
  const formData = new FormData();
  formData.append(assetFieldNames[assetType], file);
  const response = await apiClient.post<ApiSuccessResponse<BusinessProfileResponse>>(
    `/settings/business-profile/${assetType}`,
    formData,
    { headers: { 'Content-Type': undefined } },
  );
  return response.data.data.businessProfile;
}

export async function deleteBrandingAssetRequest(assetType: BrandingAssetType) {
  const response = await apiClient.delete<ApiSuccessResponse<BusinessProfileResponse>>(
    `/settings/business-profile/${assetType}`,
  );
  return response.data.data.businessProfile;
}
