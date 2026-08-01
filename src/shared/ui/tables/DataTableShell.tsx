import Stack from '@mui/material/Stack';
import TableContainer, { type TableContainerProps } from '@mui/material/TableContainer';
import type { ElementType, ReactNode } from 'react';

type DataTableContainerProps = Omit<TableContainerProps, 'children'> & {
  component?: ElementType;
  variant?: 'elevation' | 'outlined';
};

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
  tableContainerProps?: DataTableContainerProps;
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
  tableContainerProps,
}: DataTableShellProps) {
  const loadedContent = tableContainerProps ? (
    <TableContainer {...tableContainerProps}>{children}</TableContainer>
  ) : (
    children
  );

  return (
    <>
      {refreshIndicator}
      <Stack aria-busy={isLoading || isRefreshing}>
        {isLoading ? loadingContent : null}
        {!isLoading && isError ? errorContent : null}
        {!isLoading && !isError && isEmpty ? emptyContent : null}
        {!isLoading && !isError && !isEmpty ? (
          <>
            {loadedContent}
            {pagination}
          </>
        ) : null}
      </Stack>
    </>
  );
}
