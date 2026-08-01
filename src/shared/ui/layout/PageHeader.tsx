import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type PageHeaderProps = {
  actions?: ReactNode;
  description?: ReactNode;
  headingLevel?: HeadingLevel;
  title: ReactNode;
};

export function PageHeader({ actions, description, headingLevel = 1, title }: PageHeaderProps) {
  const headingComponent = `h${headingLevel}` as const;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'stretch', sm: 'center' }}
    >
      <Box>
        <Typography component={headingComponent} variant={headingLevel === 1 ? 'h1' : 'h2'}>
          {title}
        </Typography>
        {description ? <Typography color="text.secondary">{description}</Typography> : null}
      </Box>

      {actions ? <Box sx={{ display: 'flex', justifyContent: { sm: 'flex-end' } }}>{actions}</Box> : null}
    </Stack>
  );
}
