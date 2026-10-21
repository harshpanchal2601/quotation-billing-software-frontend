import Avatar from '@mui/material/Avatar';

type UserAvatarProps = {
  name: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? 'U';
  const second = parts.length > 1 ? parts[1]?.[0] : undefined;
  return `${first}${second ?? ''}`.toUpperCase();
}

export function UserAvatar({ name }: UserAvatarProps) {
  return <Avatar sx={{ bgcolor: 'secondary.main' }}>{getInitials(name)}</Avatar>;
}
