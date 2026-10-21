import TablePagination, { type TablePaginationProps } from '@mui/material/TablePagination';

export type AppTablePaginationProps = {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  rowsPerPageOptions?: number[];
  sx?: TablePaginationProps['sx'];
};

export function AppTablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  rowsPerPageOptions = [10, 20, 50],
  sx,
}: AppTablePaginationProps) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={page - 1}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={rowsPerPageOptions}
      onPageChange={(_event, nextPage) => onPageChange(nextPage + 1)}
      onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
      sx={[
        {
          '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', columnGap: 1, px: { xs: 1, sm: 2 } },
          '& .MuiTablePagination-spacer': { display: { xs: 'none', sm: 'block' } },
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { my: 1 },
          '& .MuiTablePagination-input': { mr: { xs: 1, sm: 4 }, ml: 0 },
          '& .MuiTablePagination-actions': { ml: { xs: 0, sm: 2 } },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    />
  );
}
