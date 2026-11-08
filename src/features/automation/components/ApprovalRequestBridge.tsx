import axios from 'axios';
import { useEffect } from 'react';
import { apiClient, type ApiErrorResponse } from '@shared/api/apiClient';

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Domain commands have already been requested by the user. An approval-required
// response pauses execution and creates only the review request, never the effect.
export function ApprovalRequestBridge() {
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(undefined, async (error: unknown) => {
      if (!axios.isAxiosError<ApiErrorResponse>(error)) return Promise.reject(error);
      const details = error.response?.data.errors;
      if (error.response?.status === 409 && record(details) && details.code === 'APPROVAL_REQUIRED' && record(details.command) && !/^\/?approvals(?:\/|$)/.test(error.config?.url ?? '')) {
        await apiClient.post('/approvals', details.command, { firmContextRevision: error.config?.firmContextRevision });
        error.response.data.message = 'Approval requested. Open Approvals & Notifications to review the request. A different firm administrator must decide before you perform this action.';
      }
      return Promise.reject(error);
    });
    return () => apiClient.interceptors.response.eject(interceptor);
  }, []);
  return null;
}
