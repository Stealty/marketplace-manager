import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { LastSyncedInfo } from '@/components/LastSyncedInfo';
import { getQuestionThreads, getQuestionsLastSyncedAt } from '@/services/questionsService';
import { ThreadList } from './thread-list';

export default async function PerguntasPage() {
  const [threads, lastSuccessAt] = await Promise.all([
    getQuestionThreads(),
    getQuestionsLastSyncedAt(),
  ]);

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Atendimento"
        title="Perguntas"
        subtitle="Perguntas de compradores em todas as contas conectadas, priorizando as pendentes."
        action={<LastSyncedInfo lastSuccessAt={lastSuccessAt} />}
      />
      <ThreadList threads={threads} />
    </Stack>
  );
}
