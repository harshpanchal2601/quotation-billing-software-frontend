import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { paths } from '@shared/routing/paths';
import { toApiError } from '@shared/api/apiClient';
import { AppSnackbar } from '@shared/ui/feedback';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createCompanyRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../model/companies.query-keys';
import { CompanyForm } from '../components/CompanyForm';
import type { CompanyCreateSubmitValues } from '../model/company.schema';

export function CreateCompanyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: createCompanyRequest,
    onSuccess: async (company) => {
      await queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() });
      setSuccessMessage('Company created.');
      navigate(`${paths.companies}/${company.id}`);
    },
    onError: (error) => setErrorMessage(toApiError(error).message),
  });

  async function handleSubmit(values: CompanyCreateSubmitValues) {
    setErrorMessage(null);
    await mutation.mutateAsync(values);
  }

  return (
    <PageContainer maxWidth={1040}>
      <PageHeader title="Add Company" description="Create a company with an optional primary contact and addresses." />
      <CompanyForm mode="create" isSubmitting={mutation.isPending} errorMessage={errorMessage} onSubmit={handleSubmit} onCancel={() => navigate(paths.companies)} />
      <AppSnackbar open={successMessage !== null} autoHideDuration={4000} message={successMessage} onClose={() => setSuccessMessage(null)} />
    </PageContainer>
  );
}
