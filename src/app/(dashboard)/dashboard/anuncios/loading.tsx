import { Box, Paper, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Catálogo"
        title="Anúncios"
        subtitle="Preço, status e qualidade dos anúncios em todas as contas conectadas."
      />
      <SectionPanel>
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Paper key={i} sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Skeleton variant="text" width="50%" />
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="rectangular" height={6} sx={{ borderRadius: 3 }} />
              </Stack>
            </Paper>
          ))}
        </Box>
      </SectionPanel>
    </Stack>
  );
}
