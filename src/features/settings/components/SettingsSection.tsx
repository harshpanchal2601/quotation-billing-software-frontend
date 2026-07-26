import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { PropsWithChildren } from 'react';

type SettingsSectionProps = PropsWithChildren<{
  title: string;
  description?: string;
}>;

export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  return (
    <Box component="section" sx={{ py: 2.5, borderBottom: 1, borderColor: 'divider' }}>
      <Stack spacing={2}>
        <Box>
          <Typography component="h2" variant="h3">
            {title}
          </Typography>
          {description ? <Typography color="text.secondary">{description}</Typography> : null}
        </Box>
        {children}
      </Stack>
    </Box>
  );
}

