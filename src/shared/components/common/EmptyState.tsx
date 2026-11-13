import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  embedded?: boolean;
};

export function EmptyState({ title, description, action, embedded = false }: EmptyStateProps) {
  return (
    <Box role="status" sx={{ border: embedded ? 0 : 1, borderColor: 'divider', borderRadius: embedded ? 0 : 3, p: { xs: 3, sm: 4 }, minHeight: 200, bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', boxSizing: 'border-box' }}>
      <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ maxWidth: 480, minWidth: 0 }}>
        <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'action.hover', display: 'grid', placeItems: 'center' }}><InboxOutlinedIcon color="primary" aria-hidden="true" /></Box>
        <Typography component="h3" variant="h6" sx={{ overflowWrap: 'anywhere' }}>{title}</Typography>
        {description ? <Typography color="text.secondary" variant="body2" sx={{ overflowWrap: 'anywhere' }}>{description}</Typography> : null}
        {action}
      </Stack>
    </Box>
  );
}
