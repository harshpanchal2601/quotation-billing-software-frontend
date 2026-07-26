import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export function HomePage() {
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
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 560,
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: { xs: 3, sm: 4 },
          textAlign: 'center',
        }}
      >
        <Stack spacing={1.5}>
          <Typography component="h1" variant="h4" fontWeight={700} color="text.primary">
            Buminex Quotation Management System
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Frontend foundation is ready.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
