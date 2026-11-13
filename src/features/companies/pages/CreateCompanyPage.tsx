import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { paths } from '@shared/routing/paths';
import { useSaveAndReturn } from '@shared/routing/returnNavigation';
import { PageContainer, PageHeader } from '@shared/ui/layout';
import { createCompanyRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../model/companies.query-keys';
import { CompanyForm } from '../components/CompanyForm';
import type { CompanyCreateSubmitValues } from '../model/company.schema';

export function CreateCompanyPage() {
  const { cancel, saved, failed, hasSaved } = useSaveAndReturn(paths.companies);
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: createCompanyRequest,
    onSuccess: async () => {
      await saved('Company created.', () => queryClient.invalidateQueries({ queryKey: companiesQueryKeys.lists() }));
    },
    onError: (error) => { const failure = failed(error); if (!failure.cancelled) setErrorMessage(failure.message); },
  });

  async function handleSubmit(values: CompanyCreateSubmitValues) {
    setErrorMessage(null);
    try { await mutation.mutateAsync(values); } catch { /* The mutation reports the failure and retains the form. */ }
  }

  return (
    <PageContainer maxWidth={1040}>
      <PageHeader title="Add Company" description="Create a company with an optional primary contact and addresses." />
      <CompanyForm hasSaved={hasSaved} mode="create" isSubmitting={mutation.isPending} errorMessage={errorMessage} onSubmit={handleSubmit} onCancel={cancel} />
    </PageContainer>
  );
}
