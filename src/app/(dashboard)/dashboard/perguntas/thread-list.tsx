'use client';

import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionPanel } from '@/components/SectionPanel';
import { StatusTag } from '@/components/StatusTag';
import { EmptyState } from '@/components/EmptyState';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { QuestionThreadWithRelations } from '@/services/questionsService';
import { answerThread } from './actions';

type Filter = 'pending' | 'answered' | 'all';

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
    <Stack spacing={1} onClick={(e) => e.stopPropagation()}>
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

export function ThreadList({ threads }: { threads: QuestionThreadWithRelations[] }) {
  const [filter, setFilter] = React.useState<Filter>('pending');
  const [openId, setOpenId] = React.useState<string | null>(null);

  const filtered = threads.filter((thread) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return thread.status === 'pending';
    return thread.status !== 'pending';
  });

  if (threads.length === 0) {
    return (
      <SectionPanel kicker="Atendimento" title="Perguntas dos compradores">
        <EmptyState message="Nenhuma pergunta sincronizada ainda. Conecte um marketplace em Conexões para começar a receber perguntas aqui." />
      </SectionPanel>
    );
  }

  return (
    <SectionPanel dense>
      <Tabs value={filter} onChange={(_, value) => setFilter(value)} sx={{ px: 2, pt: 1 }}>
        <Tab value="pending" label="Pendentes" />
        <Tab value="answered" label="Respondidas" />
        <Tab value="all" label="Todas" />
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState message="Nenhuma pergunta nesse filtro." />
      ) : (
        <Stack divider={<Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }} />}>
          {filtered.map((thread) => {
            const isOpen = openId === thread.id;
            const isPending = thread.status === 'pending';
            return (
              <Box key={thread.id}>
                <Box
                  onClick={() => setOpenId(isOpen ? null : thread.id)}
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <StatusTag
                      label={isPending ? 'Pendente' : 'Respondida'}
                      tone={isPending ? 'warning' : 'success'}
                    />
                    <Typography variant="body2" sx={{ flexGrow: 1 }} noWrap>
                      {thread.question_text ?? 'Pergunta sem texto sincronizado'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
                      {thread.marketplace_connections
                        ? MARKETPLACE_LABELS[thread.marketplace_connections.marketplace]
                        : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">
                      {thread.last_message_at
                        ? formatDistanceToNow(new Date(thread.last_message_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : '—'}
                    </Typography>
                  </Stack>
                </Box>
                <Collapse in={isOpen}>
                  <Stack spacing={1} sx={{ px: 2, pb: 2, bgcolor: 'action.hover' }}>
                    {thread.chat_messages.length === 0 ? (
                      <Typography variant="caption" color="text.secondary">
                        Sem mensagens sincronizadas para esta thread.
                      </Typography>
                    ) : (
                      thread.chat_messages
                        .sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
                        .map((message) => (
                          <Box key={message.id}>
                            <Typography variant="caption" fontWeight={700}>
                              {message.sender}
                            </Typography>
                            <Typography variant="body2">{message.body}</Typography>
                          </Box>
                        ))
                    )}
                    {isPending && <AnswerForm threadId={thread.id} />}
                  </Stack>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      )}
    </SectionPanel>
  );
}
