import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

export type TableSkeletonProps = {
  rowCount?: number;
  rowHeight?: number;
};

export function TableSkeleton({ rowCount = 6, rowHeight = 64 }: TableSkeletonProps) {
  return (
    <Stack spacing={1} aria-label="Loading table data">
      {Array.from({ length: rowCount }).map((_, index) => (
        <Skeleton key={index} height={rowHeight} />
      ))}
    </Stack>
  );
}
