import { useQuery } from '@tanstack/react-query';
import { apiClient, type ApiSuccessResponse } from '../api/apiClient';
import { useSelectedFirm } from './selectedFirm';

export type EffectiveAccess = {
  firmId: number; legacy: boolean; evaluatedAt: string;
  permissions: Record<string, boolean>;
  features: Array<{ key: string; description: string; module: string; dependencies: string[]; required: boolean; available: boolean; allowed: boolean; reason: string }>;
  quotas: Array<{ resource: string; used: string; limit: string | null; remaining: string | null; ready: boolean; overrideId: number | null }>;
  subscription: null | { id: number; status: string; planVersionId: number; planName: string; revision: number; effectiveFrom: string; effectiveUntil: string | null; trialEndsAt: string | null; graceEndsAt: string | null; currentPeriodEndsAt: string | null; renewalAt: string | null };
};

type EntitlementActor = { id: number; firmId: number | null; accountType: string; mustChangePassword: boolean };

export function useEntitlements(user: EntitlementActor | null, enabled = true) {
  const selectedFirm = useSelectedFirm();
  const firmId = user?.accountType === 'SUPER_ADMIN' ? selectedFirm?.id : user?.firmId;
  return useQuery({
    queryKey: ['entitlements', user?.id, firmId],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<ApiSuccessResponse<EffectiveAccess>>('/entitlements/me', { signal });
      return response.data.data;
    },
    enabled: enabled && user !== null && !user.mustChangePassword && firmId !== null && firmId !== undefined,
    staleTime: 15_000, refetchInterval: 30_000, retry: false,
  });
}

export function permitsEntitledPermission(access: EffectiveAccess | undefined, permissions: readonly string[]) {
  return access !== undefined && permissions.some((permission) => access.permissions[permission] === true);
}
