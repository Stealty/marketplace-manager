import { Paper, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Painel"
        title="Visão geral"
        subtitle="Indicadores consolidados de todas as contas de marketplace conectadas."
      />
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {Array.from({ length: 4 }).map((_, i) => (
          <Paper key={i} sx={{ p: 2.5, minWidth: 220, flex: '1 1 220px' }}>
            <Stack spacing={0.5}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" height={40} />
              <Skeleton variant="text" width="80%" />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
