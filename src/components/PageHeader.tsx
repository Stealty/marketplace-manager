import { Box, Stack, Typography } from '@mui/material';

export function PageHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'center' }}
    >
      <Box>
        <Typography
          variant="caption"
          color="primary.main"
          fontWeight={700}
          letterSpacing="0.12em"
          sx={{ textTransform: 'uppercase' }}
        >
          {kicker}
        </Typography>
        <Typography variant="h4" mt={0.5}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box>{action}</Box>}
    </Stack>
  );
}
