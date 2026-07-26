import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Box border={1} borderColor="divider" borderRadius={3} p={4} bgcolor="background.paper">
      <Stack spacing={1} alignItems="center" textAlign="center">
        <InboxOutlinedIcon color="primary" />
        <Typography variant="h3">{title}</Typography>
        <Typography color="text.secondary">{description}</Typography>
      </Stack>
    </Box>
  );
}
