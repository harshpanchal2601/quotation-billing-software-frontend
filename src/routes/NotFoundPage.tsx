import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';
import { paths } from './routeConfig';

export function NotFoundPage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 3,
        py: 6,
      }}
    >
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography component="h1" variant="h4" fontWeight={700}>
          Page not found
        </Typography>
        <Typography color="text.secondary">The requested page does not exist.</Typography>
        <Button component={RouterLink} to={paths.dashboard} variant="contained">
          Go to Dashboard
        </Button>
      </Stack>
    </Box>
  );
}
