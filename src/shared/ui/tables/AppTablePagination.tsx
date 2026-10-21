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
      sx={sx}
    />
  );
}
