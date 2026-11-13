import Stack from '@mui/material/Stack';
import TableContainer, { type TableContainerProps } from '@mui/material/TableContainer';
import { Box, Paper, Table, TableBody, TableCell, TableHead, TableRow, TableSortLabel, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useState, type ElementType, type ReactNode } from 'react';
import { AppTablePagination } from './AppTablePagination';
import { TableSortControls, type TableSorting, type TableSortState } from './TableSortControls';
import { compareTableValues, type TableSortValue } from './tableSorting';
import { EmptyState } from '@shared/components/common/EmptyState';

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
  wrapInTableContainer?: boolean;
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
  wrapInTableContainer = true,
}: DataTableShellProps) {
  const loadedContent = wrapInTableContainer ? <TableContainer {...tableContainerProps}>{children}</TableContainer> : children;

  return (
    <>
      {refreshIndicator}
      <Stack aria-busy={isLoading || isRefreshing} sx={{ minWidth: 0, width: '100%' }}>
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

export type RecordColumn<Row> = { key: string; label: string; render: (row: Row) => ReactNode; align?: 'left' | 'right' | 'center'; minWidth?: number; noWrap?: boolean; sortKey?: string; sortValue?: (row: Row) => TableSortValue };

export function EmptyTableRow({ columnCount, title = 'No records found', description, action }: { columnCount: number; title?: string; description?: string; action?: ReactNode }) {
  return <TableRow><TableCell colSpan={columnCount} sx={{ p: 0, borderBottom: 0 }}><EmptyState embedded title={title} description={description} action={action} /></TableCell></TableRow>;
}

// One column contract feeds both semantic desktop tables and narrow-screen
// labeled records, so mobile views do not lose actions or financial columns.
export function RecordTable<Row>({ rows, columns, rowKey, label, emptyMessage = 'No records found.', rowNumberStart = 1, sorting, showSortControls = true }: { rows: readonly Row[]; columns: readonly RecordColumn<Row>[]; rowKey: (row: Row) => string | number; label: string; emptyMessage?: string; rowNumberStart?: number; sorting?: TableSorting; showSortControls?: boolean }) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const [localSort, setLocalSort] = useState<TableSortState>({ sortBy: '', sortOrder: 'asc' });
  const fields = sorting?.fields ?? columns.filter((column) => column.sortValue).map((column) => ({ key: column.key, label: column.label }));
  const sort = sorting ?? { ...localSort, fields, onChange: setLocalSort };
  const localColumn = !sorting ? columns.find((column) => column.key === localSort.sortBy) : undefined;
  const records = localColumn?.sortValue ? rows.map((row, index) => ({ row, index })).sort((a, b) => {
    const x = localColumn.sortValue!(a.row); const y = localColumn.sortValue!(b.row);
    if (x == null || y == null) return x == null && y == null ? a.index - b.index : x == null ? 1 : -1;
    return compareTableValues(x, y) * (localSort.sortOrder === 'asc' ? 1 : -1) || a.index - b.index;
  }).map(({ row }) => row) : rows;
  const controls = showSortControls && fields.length > 0 ? <TableSortControls {...sort} allowUnsorted={!sorting} /> : null;
  if (compact) return <Stack spacing={2}>{controls}<Stack component="section" aria-label={label} spacing={1.5}>
    {records.length === 0 ? <EmptyState title="No records found" description={emptyMessage} /> : null}
    {records.map((row, index) => <Paper component="article" variant="outlined" key={rowKey(row)} sx={{ p: 2, minWidth: 0 }}><Stack component="dl" spacing={1.25} sx={{ m: 0 }}>
      <Box sx={{ display: 'flex', gap: 1 }}><Typography component="dt" variant="body2" color="text.secondary">No.</Typography><Typography component="dd" sx={{ m: 0 }}>{rowNumberStart + index}</Typography></Box>
      {columns.map((column) => <Box key={column.key} sx={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) minmax(0, 2fr)', gap: 1, alignItems: 'start' }}><Typography component="dt" variant="body2" color="text.secondary">{column.label}</Typography><Box component="dd" sx={{ m: 0, overflowWrap: 'anywhere', textAlign: column.align ?? 'left' }}>{column.render(row)}</Box></Box>)}
    </Stack></Paper>)}
  </Stack></Stack>;
  return <Stack spacing={2}>{controls}<TableContainer component={Paper} variant="outlined" role="region" aria-label={label} tabIndex={0} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
    <Table aria-label={label} size="small"><TableHead sx={{ bgcolor: 'grey.50', '& .MuiTableCell-root': { fontWeight: 700 } }}><TableRow><TableCell scope="col" align="center" sx={{ minWidth: 64, width: 64, px: 2 }}>No.</TableCell>{columns.map((column) => {
      const key = sorting ? column.sortKey : column.sortValue ? column.key : undefined;
      const sortable = key != null && fields.some((field) => field.key === key);
      return <TableCell key={column.key} scope="col" align={column.align} aria-label={column.label} sx={{ whiteSpace: 'nowrap', minWidth: column.minWidth ?? (column.align === 'right' ? 104 : 144) }} sortDirection={sort.sortBy === key ? sort.sortOrder : false}>{sortable ? <TableSortLabel active={sort.sortBy === key} direction={sort.sortBy === key ? sort.sortOrder : 'asc'} onClick={() => sort.onChange({ sortBy: key, sortOrder: sort.sortBy === key && sort.sortOrder === 'asc' ? 'desc' : 'asc' })}>{column.label}</TableSortLabel> : column.label}</TableCell>;
    })}</TableRow></TableHead><TableBody>
      {records.length === 0 ? <EmptyTableRow columnCount={columns.length + 1} description={emptyMessage} /> : null}
      {records.map((row, index) => <TableRow key={rowKey(row)} hover><TableCell align="center" sx={{ minWidth: 64, width: 64, px: 2, fontVariantNumeric: 'tabular-nums' }}>{rowNumberStart + index}</TableCell>{columns.map((column) => <TableCell key={column.key} align={column.align} sx={{ minWidth: column.minWidth ?? (column.align === 'right' ? 104 : 144), overflowWrap: column.noWrap ? 'normal' : 'break-word', wordBreak: 'normal', ...(column.noWrap || column.align === 'right' ? { whiteSpace: 'nowrap' } : {}), ...(column.align === 'right' ? { fontVariantNumeric: 'tabular-nums' } : {}) }}>{column.render(row)}</TableCell>)}</TableRow>)}
    </TableBody></Table>
  </TableContainer></Stack>;
}

export function RecordPagination({ pagination, page, change }: { pagination?: { page?: number; limit: number; total: number; hasMore?: boolean }; page: number; change: (page: number) => void }) {
  useEffect(() => {
    if (!pagination || pagination.total < 0 || (pagination.page !== undefined && pagination.page !== page)) return;
    const lastPage = Math.max(1, Math.ceil(pagination.total / pagination.limit));
    if (page > lastPage) change(lastPage);
  }, [pagination, page, change]);
  if (!pagination) return null;
  return <AppTablePagination count={pagination.total} page={pagination.total < 0 ? page : Math.min(page, Math.max(1, Math.ceil(pagination.total / pagination.limit)))} rowsPerPage={pagination.limit} rowsPerPageOptions={[pagination.limit]} hasNextPage={pagination.hasMore} onPageChange={change} onRowsPerPageChange={() => change(1)} />;
}
