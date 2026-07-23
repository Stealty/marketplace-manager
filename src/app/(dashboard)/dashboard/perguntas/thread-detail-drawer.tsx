'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DetailDrawer } from '@/components/DetailDrawer';
import { ExternalLinkButton } from '@/components/ExternalLinkButton';
import { senderLabel } from '@/lib/format';
import type { QuestionThreadWithRelations } from '@/services/questionsService';
import { answerThread } from './actions';
import { threadEmptyText, isAnswerable } from './status';

function AnswerForm({ threadId }: { threadId: string }) {
  const [text, setText] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSend() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await answerThread(threadId, text);
      if (result.error) {
        setError(result.error);
      } else {
        setText('');
        setError(null);
      }
    });
  }

  return (
    <Stack spacing={1}>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        multiline
        minRows={2}
        size="small"
        placeholder="Escreva a resposta para o comprador..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isPending}
      />
      <Stack direction="row" justifyContent="flex-end">
        <Button
          size="small"
          variant="contained"
          disabled={isPending || text.trim().length === 0}
          onClick={() => setConfirmOpen(true)}
        >
          Responder
        </Button>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar envio da resposta</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta resposta será enviada diretamente ao Mercado Livre e não pode ser desfeita. Confirma o
            envio?
          </DialogContentText>
          <Typography variant="body2" sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
            {text}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSend}>
            Enviar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function ThreadDetailDrawer({
  thread,
  onClose,
}: {
  thread: QuestionThreadWithRelations | null;
  onClose: () => void;
}) {
  if (!thread) return null;

  return (
    <DetailDrawer
      open={Boolean(thread)}
      onClose={onClose}
      title={thread.question_text?.trim() || threadEmptyText(thread.status)}
      subtitle={
        thread.marketplace_connections
          ? thread.marketplace_connections.seller_nickname ?? thread.marketplace_connections.label
          : undefined
      }
    >
      <Stack spacing={2}>
        {thread.product_listings?.permalink && (
          <ExternalLinkButton href={thread.product_listings.permalink} label="Ver anúncio no Mercado Livre" />
        )}

        <Stack spacing={1}>
          {thread.chat_messages.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Sem mensagens sincronizadas para esta thread.
            </Typography>
          ) : (
            thread.chat_messages
              .slice()
              .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
              .map((message) => (
                <Box key={message.id}>
                  <Typography variant="caption" fontWeight={700}>
                    {senderLabel(message.sender)}
                  </Typography>
                  <Typography variant="body2">
                    {message.body?.trim() || 'Mensagem sem texto sincronizado.'}
                  </Typography>
                </Box>
              ))
          )}
        </Stack>
        {isAnswerable(thread.status) && <AnswerForm threadId={thread.id} />}
      </Stack>
    </DetailDrawer>
  );
}
