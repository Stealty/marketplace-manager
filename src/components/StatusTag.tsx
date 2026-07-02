import { Stack, Typography } from '@mui/material';
import type { Tone } from '@/theme/tokens';

const DOT_COLOR: Record<Tone, string> = {
  accent: 'primary.main',
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  neutral: 'text.secondary',
};

export function StatusTag({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{
        display: 'inline-flex',
        px: 1,
        py: 0.375,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '6px',
        width: 'fit-content',
      }}
    >
      <Stack sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: DOT_COLOR[tone] }} />
      <Typography variant="caption" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
  );
}
