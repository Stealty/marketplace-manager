import { Box, Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Atendimento"
        title="Perguntas"
        subtitle="Perguntas de compradores em todas as contas conectadas, priorizando as pendentes."
      />
      <SectionPanel dense>
        <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Stack key={i} direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
              <Skeleton variant="rounded" width={90} height={24} />
              <Skeleton variant="text" width="50%" sx={{ flexGrow: 1 }} />
              <Skeleton variant="text" width={80} />
              <Skeleton variant="text" width={60} />
            </Stack>
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
