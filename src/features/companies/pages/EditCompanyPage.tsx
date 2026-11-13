import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { paths } from '@shared/routing/paths';
import { toApiError } from '@shared/api/apiClient';
import { getCompanyRequest, updateCompanyRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../model/companies.query-keys';
import { CompanyForm } from '../components/CompanyForm';
import type { CompanyUpdateSubmitValues } from '../model/company.schema';

export function EditCompanyPage() {
  const companyId = Number(useParams().id);
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(paths.companies);
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: companiesQueryKeys.detail(companyId), queryFn: () => getCompanyRequest(companyId), enabled: Number.isFinite(companyId) });
  const mutation = useMutation({
    mutationFn: (values: CompanyUpdateSubmitValues) => updateCompanyRequest(companyId, values),
    onSuccess: async (company) => {
      queryClient.setQueryData(companiesQueryKeys.detail(companyId), company);
      await saved('Company updated.', () => queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() }));
    },
    onError: (error) => { const failure = failed(error); if (!failure.cancelled) setErrorMessage(failure.message); },
  });

  if (!Number.isFinite(companyId)) return <ErrorState message="Company not found" />;
  if (query.isPending) return <PageContainer spacing={1}>{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={56} />)}</PageContainer>;
  if (query.isError) return <Stack spacing={1}><ErrorState message={toApiError(query.error).message} /><AppButton onClick={() => void query.refetch()}>Retry</AppButton></Stack>;

  return (
    <PageContainer maxWidth={1040}>
      <PageHeader title={`Edit ${query.data.name}`} description="Company contacts and addresses are managed from the details page." />
      <CompanyForm hasSaved={hasSaved} mode="edit" company={query.data} isSubmitting={mutation.isPending} errorMessage={errorMessage} onSubmit={async (values) => { setErrorMessage(null); try { await mutation.mutateAsync(values); } catch { /* The mutation reports the failure and retains the form. */ } }} onCancel={cancel} />
    </PageContainer>
  );
}
