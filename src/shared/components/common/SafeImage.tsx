import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useState, type ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

type SafeImageProps = {
  src: string | null | undefined;
  alt: string;
  fallbackLabel: string;
  imgSx?: SxProps<Theme>;
  fallback?: ReactNode;
};

export function SafeImage({ src, alt, fallbackLabel, imgSx, fallback }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const imageSrc = src?.trim() ?? '';

  useEffect(() => {
    setHasError(false);
    setHasLoaded(false);
  }, [imageSrc]);

  if (imageSrc.length > 0 && !hasError) {
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }} aria-busy={!hasLoaded}>
        {!hasLoaded ? (
          <Skeleton
            variant="rectangular"
            width="100%"
            height="100%"
            aria-label={`Loading ${alt}`}
            sx={{ position: 'absolute', inset: 0, borderRadius: 1 }}
          />
        ) : null}
        <Box
          component="img"
          src={imageSrc}
          alt={alt}
          onLoad={() => setHasLoaded(true)}
          onError={() => setHasError(true)}
          sx={[
            {
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
              opacity: hasLoaded ? 1 : 0,
            },
            ...(Array.isArray(imgSx) ? imgSx : imgSx ? [imgSx] : []),
          ]}
        />
      </Box>
    );
  }

  if (fallback) return <>{fallback}</>;

  return (
    <Stack spacing={0.5} alignItems="center" justifyContent="center" color="text.secondary" role="img" aria-label={fallbackLabel}>
      <ImageOutlinedIcon fontSize="small" />
      <Typography variant="caption">{fallbackLabel}</Typography>
    </Stack>
  );
}
