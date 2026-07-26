import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type AppBrandProps = {
  variant?: 'full' | 'compact';
};

export function AppBrand({ variant = 'full' }: AppBrandProps) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
      <Box
        component="img"
        src="/logo/buminex-logo.jpeg"
        alt="Buminex Pharmtech Solutions logo"
        sx={{
          width: variant === 'compact' ? 40 : 48,
          height: variant === 'compact' ? 40 : 48,
          objectFit: 'contain',
          flex: '0 0 auto',
        }}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
      />
      {variant === 'full' ? (
        <Box minWidth={0}>
          <Typography variant="h4" color="secondary.main" noWrap>
            BUMINEX
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            Quotation Management
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
