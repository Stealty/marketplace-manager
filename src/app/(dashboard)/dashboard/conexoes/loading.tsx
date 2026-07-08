import { Box, Paper, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Integrações"
        title="Conexões"
        subtitle="Contas de marketplace e ERP conectadas a este workspace."
      />

      <SectionPanel kicker="Marketplaces" title="Contas conectadas">
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Paper key={i} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="rounded" width={90} height={24} />
                <Skeleton variant="text" width="60%" />
              </Stack>
            </Paper>
          ))}
        </Box>
      </SectionPanel>

      <SectionPanel kicker="ERP" title="Integração com ERP">
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          <Paper variant="outlined" sx={{ p: 2.5 }}>
            <Stack spacing={1.5}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="rounded" width={90} height={24} />
            </Stack>
          </Paper>
        </Box>
      </SectionPanel>
    </Stack>
  );
}
