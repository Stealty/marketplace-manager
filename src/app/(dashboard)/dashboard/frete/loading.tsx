import { Box, Paper, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Logística"
        title="Frete"
        subtitle="Relação entre frete e valor do pedido, por conta de marketplace."
      />

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {Array.from({ length: 3 }).map((_, i) => (
          <Paper key={i} sx={{ p: 2.5, minWidth: 220, flex: '1 1 220px' }}>
            <Stack spacing={0.5}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" height={40} />
            </Stack>
          </Paper>
        ))}
      </Stack>

      <SectionPanel kicker="Distribuição" title="% Frete por faixa">
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rectangular" height={220} />
        </Box>
      </SectionPanel>

      <SectionPanel kicker="Pedidos" title="Detalhamento">
        <Stack spacing={1} sx={{ p: 2 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} />
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
