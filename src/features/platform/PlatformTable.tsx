import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { ErrorState } from '@shared/components/common/ErrorState';
import { DataTableShell, EmptyTableRow, TableSkeleton } from '@shared/ui/tables';

type Column = { key: string; label: string; align?: 'left' | 'right' | 'center' };

export function PlatformTable({ label, columns, children, isLoading = false, isError = false, isEmpty, emptyMessage, errorMessage = 'Data could not be loaded.', onRetry, pagination, minWidth = 720, rowNumberStart = 1 }: {
  label: string; columns: readonly Column[]; children: ReactNode; isLoading?: boolean; isError?: boolean;
  isEmpty: boolean; emptyMessage: string; errorMessage?: string; onRetry?: () => void;
  pagination?: ReactNode; minWidth?: number; rowNumberStart?: number;
}) {
  return (
    <>
      <DataTableShell
        isLoading={isLoading}
        isError={isError}
        isEmpty={false}
        loadingContent={<TableSkeleton rowCount={4} />}
        errorContent={<ErrorState message={errorMessage} onRetry={onRetry} />}
        emptyContent={null}
      >
        <Table aria-label={label} size="small" sx={{ minWidth, '& td': { verticalAlign: 'top' }, '& td, & th': { py: 1.5 } }}>
          <TableHead>
            <TableRow><TableCell scope="col" align="right">No.</TableCell>{columns.map((column) => <TableCell scope="col" key={column.key} align={column.align}>{column.label}</TableCell>)}</TableRow>
          </TableHead>
          <TableBody>{isEmpty ? <EmptyTableRow columnCount={columns.length + 1} description={emptyMessage} /> : Children.toArray(children).map((row, index) => isValidElement(row) ? cloneElement(row as ReactElement<{ children?: ReactNode }>, {}, <TableCell align="right">{rowNumberStart + index}</TableCell>, row.props.children) : row)}</TableBody>
        </Table>
      </DataTableShell>
      {!isLoading && !isError ? pagination : null}
    </>
  );
}

export function PlatformPagination({ label, page, totalPages, onChange, disabled = false }: {
  label: string; page: number; totalPages: number; onChange: (page: number) => void; disabled?: boolean;
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between" sx={{ pt: 2 }}>
      <Typography variant="body2" color="text.secondary">Page {page} of {Math.max(1, totalPages)}</Typography>
      <Pagination aria-label={`${label} pages`} page={page} count={Math.max(1, totalPages)} onChange={(_, next) => onChange(next)} disabled={disabled} shape="rounded" size="small" />
    </Stack>
  );
}
