import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { resolveAssetUrl } from '@shared/api/assetUrl';

type AppBrandProps = {
  variant?: 'full' | 'compact';
  name?: string;
  logoUrl?: string | null;
};

export function AppBrand({ variant = 'full', name = 'ERP Workspace', logoUrl }: AppBrandProps) {
  const resolvedLogoUrl = resolveAssetUrl(logoUrl);

  return (
    <Stack direction="row" spacing={1.25} alignItems="center" minWidth={0}>
      {resolvedLogoUrl ? (
        <Box
          key={resolvedLogoUrl}
          component="img"
          src={resolvedLogoUrl}
          alt={`${name} logo`}
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
      ) : null}
      {variant === 'full' ? (
        <Box minWidth={0}>
          <Typography variant="h4" color="secondary.main" noWrap>
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            Quotation Management
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}
