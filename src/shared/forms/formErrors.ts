import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';

import type { ApiFieldErrors } from '@shared/api/apiClient';

export function applyApiFieldErrors<
  TFieldValues extends FieldValues,
  TContext = unknown,
  TTransformedValues extends FieldValues | undefined = undefined,
>(
  form: UseFormReturn<TFieldValues, TContext, TTransformedValues>,
  fieldErrors: ApiFieldErrors,
) {
  Object.entries(fieldErrors).forEach(([fieldName, message]) => {
    form.setError(fieldName as Path<TFieldValues>, {
      type: 'server',
      message,
    });
  });
}
