import Stack from '@mui/material/Stack';
import type { ReactNode } from 'react';

export type DataTableShellProps = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  loadingContent: ReactNode;
  errorContent: ReactNode;
  emptyContent: ReactNode;
  children: ReactNode;
  pagination?: ReactNode;
  refreshIndicator?: ReactNode;
  isRefreshing?: boolean;
};

export function DataTableShell({
  isLoading,
  isError,
  isEmpty,
  loadingContent,
  errorContent,
  emptyContent,
  children,
  pagination = null,
  refreshIndicator = null,
  isRefreshing = false,
}: DataTableShellProps) {
  return (
    <>
      {refreshIndicator}
      <Stack aria-busy={isLoading || isRefreshing}>
        {isLoading ? loadingContent : null}
        {!isLoading && isError ? errorContent : null}
        {!isLoading && !isError && isEmpty ? emptyContent : null}
        {!isLoading && !isError && !isEmpty ? (
          <>
            {children}
            {pagination}
          </>
        ) : null}
      </Stack>
    </>
  );
}
