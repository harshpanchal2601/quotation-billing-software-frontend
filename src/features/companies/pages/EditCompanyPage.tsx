import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '@shared/components/common/ErrorState';
import { AppButton } from '@shared/ui/actions';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { paths } from '@app/router/routeConfig';
import { toApiError } from '@shared/api/apiClient';
import { getCompanyRequest, updateCompanyRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../companies.query-keys';
import { CompanyForm } from '../components/CompanyForm';
import type { CompanyUpdateSubmitValues } from '../schemas/company.schema';

export function EditCompanyPage() {
  const companyId = Number(useParams().id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const query = useQuery({ queryKey: companiesQueryKeys.detail(companyId), queryFn: () => getCompanyRequest(companyId), enabled: Number.isFinite(companyId) });
  const mutation = useMutation({
    mutationFn: (values: CompanyUpdateSubmitValues) => updateCompanyRequest(companyId, values),
    onSuccess: async (company) => {
      queryClient.setQueryData(companiesQueryKeys.detail(companyId), company);
      await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() });
      setSuccessMessage('Company updated.');
      navigate(`${paths.companies}/${companyId}`);
    },
    onError: (error) => setErrorMessage(toApiError(error).message),
  });

  if (!Number.isFinite(companyId)) return <ErrorState message="Company not found" />;
  if (query.isPending) return <PageContainer spacing={1}>{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} height={56} />)}</PageContainer>;
  if (query.isError) return <Stack spacing={1}><ErrorState message={toApiError(query.error).message} /><AppButton onClick={() => void query.refetch()}>Retry</AppButton></Stack>;

  return (
    <PageContainer maxWidth={1040}>
      <PageHeader title={`Edit ${query.data.name}`} description="Company contacts and addresses are managed from the details page." />
      <CompanyForm mode="edit" company={query.data} isSubmitting={mutation.isPending} errorMessage={errorMessage} onSubmit={async (values) => { setErrorMessage(null); await mutation.mutateAsync(values); }} onCancel={() => navigate(`${paths.companies}/${companyId}`)} />
      <AppSnackbar open={successMessage !== null} autoHideDuration={4000} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </PageContainer>
  );
}
