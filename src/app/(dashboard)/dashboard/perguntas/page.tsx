import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { getQuestionThreads } from '@/services/questionsService';
import { ThreadList } from './thread-list';

export default async function PerguntasPage() {
  const threads = await getQuestionThreads();

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Atendimento"
        title="Perguntas"
        subtitle="Perguntas de compradores em todas as contas conectadas, priorizando as pendentes."
      />
      <ThreadList threads={threads} />
    </Stack>
  );
}
