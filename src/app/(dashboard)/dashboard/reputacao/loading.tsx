import { Box, Paper, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Qualidade"
        title="Reputação"
        subtitle="Nível e indicadores de reputação em todas as contas de marketplace conectadas."
      />
      <SectionPanel>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Paper key={i} sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Skeleton variant="text" width="40%" />
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Box key={j} sx={{ minWidth: 100 }}>
                      <Skeleton variant="text" width="80%" />
                      <Skeleton variant="text" width="60%" height={32} />
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Box>
      </SectionPanel>
    </Stack>
  );
}
