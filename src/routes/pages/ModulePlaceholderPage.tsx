import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useLocation } from 'react-router-dom';

import { EmptyState } from '../../components/common/EmptyState';
import { getRouteTitle, paths } from '../routeConfig';

export function ModulePlaceholderPage() {
  const location = useLocation();
  const title = getRouteTitle(location.pathname);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        <Typography color="text.secondary">This module will be implemented in a later phase.</Typography>
      </Box>
      <EmptyState
        title={`${title} is not connected yet`}
        description="No business data is shown here until the backend module is implemented."
      />
      <Box>
        <Button component={RouterLink} to={paths.dashboard} variant="outlined">
          Back to Dashboard
        </Button>
      </Box>
    </Stack>
  );
}
