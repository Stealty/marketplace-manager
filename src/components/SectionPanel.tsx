import { Box, Paper, Stack, Typography } from '@mui/material';

export function SectionPanel({
  kicker,
  title,
  action,
  children,
  dense = false,
}: {
  kicker?: string;
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {(kicker || title || action) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            px: dense ? 2 : 2.5,
            py: dense ? 1.25 : 1.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box>
            {kicker && (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
                letterSpacing="0.1em"
                sx={{ textTransform: 'uppercase' }}
              >
                {kicker}
              </Typography>
            )}
            {title && (
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      )}
      <Box sx={{ p: dense ? 2.5 : 2.5 }}>{children}</Box>
    </Paper>
  );
}
