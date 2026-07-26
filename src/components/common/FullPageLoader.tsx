import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function FullPageLoader() {
  return (
    <Box minHeight="100vh" display="grid" sx={{ placeItems: 'center' }}>
      <Stack spacing={2} alignItems="center">
        <CircularProgress aria-label="Loading application" />
        <Typography color="text.secondary">Loading Buminex</Typography>
      </Stack>
    </Box>
  );
}
