'use client';

import * as React from 'react';
import { Box, Stack, Tab, Tabs, Typography } from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SectionPanel } from '@/components/SectionPanel';
import { StatusTag } from '@/components/StatusTag';
import { EmptyState } from '@/components/EmptyState';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import type { QuestionThreadWithRelations } from '@/services/questionsService';
import { ThreadDetailDrawer } from './thread-detail-drawer';

type Filter = 'pending' | 'answered' | 'all';

export function ThreadList({ threads }: { threads: QuestionThreadWithRelations[] }) {
  const [filter, setFilter] = React.useState<Filter>('pending');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = threads.find((thread) => thread.id === selectedId) ?? null;

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
            const isPending = thread.status === 'pending';
            return (
              <Box
                key={thread.id}
                onClick={() => setSelectedId(thread.id)}
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
            );
          })}
        </Stack>
      )}

      <ThreadDetailDrawer thread={selected} onClose={() => setSelectedId(null)} />
    </SectionPanel>
  );
}
