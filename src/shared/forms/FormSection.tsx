import Box from '@mui/material/Box';
import Stack, { type StackProps } from '@mui/material/Stack';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import type { ReactNode } from 'react';

export type FormSectionProps = Omit<StackProps, 'title'> & {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleTypographyProps?: TypographyProps;
  descriptionTypographyProps?: TypographyProps;
};

export function FormSection({
  title,
  description,
  actions = null,
  titleTypographyProps,
  descriptionTypographyProps,
  children,
  spacing = 2,
  ...stackProps
}: FormSectionProps) {
  return (
    <Stack component="section" spacing={spacing} {...stackProps}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
        <Box sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          <Typography component="h2" variant="h3" {...titleTypographyProps}>
            {title}
          </Typography>
          {description ? <Typography color="text.secondary" {...descriptionTypographyProps}>{description}</Typography> : null}
        </Box>
        {actions}
      </Stack>
      {children}
    </Stack>
  );
}
