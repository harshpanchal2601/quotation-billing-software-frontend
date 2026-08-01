import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { paths } from '@app/router/routeConfig';
import { toApiError } from '@shared/api/apiClient';
import { createCompanyRequest } from '../api/companies.api';
import { companiesQueryKeys } from '../companies.query-keys';
import { CompanyForm } from '../components/CompanyForm';
import type { CompanyCreateSubmitValues } from '../schemas/company.schema';

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
    <Stack spacing={3} maxWidth={1040}>
      <Stack>
        <Typography component="h1" variant="h1">Add Company</Typography>
        <Typography color="text.secondary">Create a company with an optional primary contact and addresses.</Typography>
      </Stack>
      <CompanyForm mode="create" isSubmitting={mutation.isPending} errorMessage={errorMessage} onSubmit={handleSubmit} onCancel={() => navigate(paths.companies)} />
      <Snackbar open={successMessage !== null} autoHideDuration={4000} onClose={() => setSuccessMessage(null)}>
        <Alert severity="success" variant="filled">{successMessage}</Alert>
      </Snackbar>
    </Stack>
  );
}
