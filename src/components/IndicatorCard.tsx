import { Paper, Stack, Typography } from '@mui/material';
import type { Tone } from '@/theme/tokens';

const TONE_COLOR: Record<Tone, string> = {
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  accent: 'primary.main',
  neutral: 'text.secondary',
};

export function IndicatorCard({
  label,
  value,
  helperText,
  tone = 'accent',
}: {
  label: string;
  value: string;
  helperText?: string;
  tone?: Tone;
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderLeft: '3px solid',
        borderLeftColor: TONE_COLOR[tone],
        minWidth: 220,
        flex: '1 1 220px',
      }}
    >
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" color={TONE_COLOR[tone]}>
          {value}
        </Typography>
        {helperText && (
          <Typography variant="caption" color="text.secondary">
            {helperText}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
