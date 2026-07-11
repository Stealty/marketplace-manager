import { Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Pós-venda"
        title="Reclamações"
        subtitle="Reclamações, disputas e devoluções em todas as contas conectadas."
      />
      <SectionPanel dense>
        <Stack spacing={1} sx={{ p: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={40} />
          ))}
        </Stack>
      </SectionPanel>
    </Stack>
  );
}
