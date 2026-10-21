import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography, { type TypographyOwnProps, type TypographyProps } from '@mui/material/Typography';
import type { ReactNode } from 'react';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  descriptionTypographyProps?: Omit<TypographyProps, 'children'>;
  headingLevel?: HeadingLevel;
  title: ReactNode;
  titleTypographyProps?: Omit<TypographyOwnProps, 'children'>;
};

export function PageHeader({
  actions,
  description,
  descriptionTypographyProps,
  headingLevel = 1,
  title,
  titleTypographyProps,
}: PageHeaderProps) {
  const headingComponent = `h${headingLevel}` as const;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
    >
      <Box>
        <Typography component={headingComponent} variant={headingLevel === 1 ? 'h1' : 'h2'} {...titleTypographyProps}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary" {...descriptionTypographyProps}>{description}</Typography> : null}
      </Box>

      {actions ? <Box sx={{ display: 'flex', justifyContent: { sm: 'flex-end' } }}>{actions}</Box> : null}
    </Stack>
  );
}
