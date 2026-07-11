import { Skeleton, Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';

export default function Loading() {
  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Financeiro"
        title="Lucratividade por venda"
        subtitle="Compare o repasse líquido de cada venda com o custo cadastrado por SKU para achar produtos com prejuízo ou margem baixa."
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
