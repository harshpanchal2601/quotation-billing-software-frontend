import Stack, { type StackProps } from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';

export type PageContainerProps = StackProps & {
  maxWidth?: StackProps['maxWidth'];
};

export function PageContainer({
  children,
  maxWidth,
  spacing = 3,
  sx,
  ...props
}: PageContainerProps) {
  const containerSx: SxProps<Theme> = {
    width: '100%',
    maxWidth,
  };

  return (
    <Stack spacing={spacing} sx={[containerSx, ...(Array.isArray(sx) ? sx : [sx])]} {...props}>
      {children}
    </Stack>
  );
}
