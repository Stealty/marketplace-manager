import { Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function LastSyncedInfo({ lastSuccessAt }: { lastSuccessAt: string | null }) {
  return (
    <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
      {lastSuccessAt
        ? `Dados atualizados ${formatDistanceToNow(new Date(lastSuccessAt), { locale: ptBR, addSuffix: true })}`
        : 'Ainda não sincronizado'}
    </Typography>
  );
}
