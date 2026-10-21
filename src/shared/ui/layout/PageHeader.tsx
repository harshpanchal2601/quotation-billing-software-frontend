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
      useFlexGap
      flexWrap="wrap"
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
    >
      <Box sx={{ flex: { sm: '1 1 240px' }, minWidth: 0, overflowWrap: 'anywhere', width: { xs: '100%', sm: 'auto' } }}>
        <Typography component={headingComponent} variant={headingLevel === 1 ? 'h1' : 'h2'} {...titleTypographyProps}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary" {...descriptionTypographyProps}>{description}</Typography> : null}
      </Box>

      {actions ? <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, flexShrink: 0, maxWidth: '100%', width: { xs: '100%', sm: 'auto' }, justifyContent: { sm: 'flex-end' }, '& > .MuiButton-root': { width: { xs: '100%', sm: 'auto' } } }}>{actions}</Box> : null}
    </Stack>
  );
}
