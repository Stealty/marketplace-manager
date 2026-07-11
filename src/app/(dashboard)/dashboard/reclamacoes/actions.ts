'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { toFriendlySyncError } from '@/lib/mercadolivre/errors';
import {
  fetchClaimDetail,
  reviewClaimReturn,
  sendClaimMessage,
  type ClaimReturnReviewAction,
} from '@/lib/mercadolivre/client';
import { syncAllClaims } from '@/services/sync/claimsSync';
import type { MarketplaceConnection } from '@/types/database';

export async function refreshClaims(): Promise<{ error?: string }> {
  const supabase = await createClient();
  try {
    await syncAllClaims(supabase);
  } catch (error) {
    return toFriendlySyncError(error);
  }
  revalidatePath('/dashboard/reclamacoes');
  return {};
}

async function getClaimConnection(claimId: string) {
  const supabase = await createClient();

  const { data: claim, error } = await supabase
    .from('claims')
    .select('org_id, external_claim_id, marketplace_connections(*)')
    .eq('id', claimId)
    .returns<
      Array<{ org_id: string; external_claim_id: string; marketplace_connections: MarketplaceConnection | null }>
    >()
    .maybeSingle();

  if (error) return { error: error.message } as const;
  if (!claim?.marketplace_connections) {
    return { error: 'Reclamação ou conexão do marketplace não encontrada.' } as const;
  }

  return {
    supabase,
    orgId: claim.org_id,
    externalClaimId: claim.external_claim_id,
    connection: claim.marketplace_connections,
  } as const;
}

export async function sendClaimReply(claimId: string, text: string): Promise<{ error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'A mensagem não pode ficar em branco.' };

  const found = await getClaimConnection(claimId);
  if ('error' in found) return { error: found.error };

  try {
    await sendClaimMessage(found.supabase, found.connection, found.externalClaimId, trimmed);
  } catch (error) {
    return toFriendlySyncError(error);
  }

  const { error: messageError } = await found.supabase.from('claim_messages').insert({
    org_id: found.orgId,
    claim_id: claimId,
    sender: 'seller',
    body: trimmed,
    sent_at: new Date().toISOString(),
  });

  if (messageError) return { error: messageError.message };

  revalidatePath('/dashboard/reclamacoes');
  return {};
}

export async function reviewReturn(
  claimId: string,
  action: ClaimReturnReviewAction
): Promise<{ error?: string }> {
  const found = await getClaimConnection(claimId);
  if ('error' in found) return { error: found.error };

  try {
    await reviewClaimReturn(found.supabase, found.connection, found.externalClaimId, action);

    // Persiste o retorno do detalhe atualizado — mesma lógica de
    // listingsActions.ts: o ML é a fonte da verdade após uma escrita.
    const detail = await fetchClaimDetail(found.supabase, found.connection, found.externalClaimId);
    const sellerPlayer = detail.players?.find((player) => player.type === 'seller');
    await found.supabase
      .from('claims')
      .update({
        status: detail.status ?? null,
        stage: detail.stage ?? null,
        seller_available_actions: sellerPlayer?.available_actions ?? [],
        last_updated: detail.last_updated ?? null,
      })
      .eq('id', claimId);
  } catch (error) {
    return toFriendlySyncError(error);
  }

  revalidatePath('/dashboard/reclamacoes');
  return {};
}
