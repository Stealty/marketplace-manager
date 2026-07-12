'use client';

import * as React from 'react';
import {
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
import { StatusTag } from '@/components/StatusTag';
import type { ClaimReturnReviewAction } from '@/lib/mercadolivre/client';
import type { ClaimWithRelations } from '@/services/claimsService';
import { reviewReturn, sendClaimReply } from './actions';

function ReplyForm({ claimId }: { claimId: string }) {
  const [text, setText] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleSend() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await sendClaimReply(claimId, text);
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
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}
      <TextField
        multiline
        minRows={2}
        size="small"
        placeholder="Escreva uma mensagem para o comprador/mediador..."
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
          Enviar
        </Button>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar envio da mensagem</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta mensagem será enviada diretamente ao Mercado Livre e não pode ser desfeita. Confirma o envio?
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

function ReturnReviewButton({
  claimId,
  action,
  label,
  confirmText,
  tone,
}: {
  claimId: string;
  action: ClaimReturnReviewAction;
  label: string;
  confirmText: string;
  tone: 'success' | 'error';
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function handleConfirm() {
    setConfirmOpen(false);
    startTransition(async () => {
      const result = await reviewReturn(claimId, action);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Stack spacing={0.5}>
      <Button
        size="small"
        variant={tone === 'success' ? 'contained' : 'outlined'}
        color={tone}
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
      >
        {label}
      </Button>
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirmar ação</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmText}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button variant="contained" color={tone} onClick={handleConfirm}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export function ClaimDetailDrawer({
  claim,
  onClose,
}: {
  claim: ClaimWithRelations | null;
  onClose: () => void;
}) {
  if (!claim) return null;

  const canApproveReturn = claim.seller_available_actions.includes('return_review_ok');
  const canRejectReturn = claim.seller_available_actions.includes('return_review_fail');

  return (
    <DetailDrawer
      open={Boolean(claim)}
      onClose={onClose}
      title={`Reclamação ${claim.external_claim_id}`}
      subtitle={
        claim.marketplace_connections
          ? claim.marketplace_connections.seller_nickname ?? claim.marketplace_connections.label
          : undefined
      }
    >
      <Stack spacing={2.5}>
        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          {claim.status ? (
            <StatusTag label={`${claim.stage ? `${claim.stage} · ` : ''}${claim.status}`} tone="neutral" />
          ) : (
            '—'
          )}
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Motivo
          </Typography>
          <Typography variant="body2">{claim.reason ?? '—'}</Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            Pedido vinculado
          </Typography>
          <Typography variant="body2">
            {claim.orders?.external_order_id ?? claim.external_order_id ?? '—'}
          </Typography>
        </Stack>

        {(canApproveReturn || canRejectReturn) && (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Devolução
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {canApproveReturn && (
                <ReturnReviewButton
                  claimId={claim.id}
                  action="return_review_ok"
                  label="Aprovar devolução"
                  tone="success"
                  confirmText="Isso confirma a aprovação da devolução junto ao Mercado Livre e não pode ser desfeito. Confirma?"
                />
              )}
              {canRejectReturn && (
                <ReturnReviewButton
                  claimId={claim.id}
                  action="return_review_fail"
                  label="Reprovar devolução"
                  tone="error"
                  confirmText="Isso reporta um problema com a devolução ao Mercado Livre (ex.: produto não recebido ou divergente) e não pode ser desfeito. Confirma?"
                />
              )}
            </Stack>
          </Stack>
        )}

        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Mensagens
          </Typography>
          {claim.claim_messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sem mensagens sincronizadas para esta reclamação.
            </Typography>
          ) : (
            claim.claim_messages
              .slice()
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
        </Stack>

        <ReplyForm claimId={claim.id} />
      </Stack>
    </DetailDrawer>
  );
}
