import { Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack alignItems="center" spacing={1.5} sx={{ py: 6, px: 2, textAlign: 'center' }}>
      <InboxOutlinedIcon sx={{ fontSize: 32, color: 'text.secondary' }} />
      <Typography variant="body2" color="text.secondary" maxWidth={360}>
        {message}
      </Typography>
      {action}
    </Stack>
  );
}
