import NextLink from 'next/link';
import { Link as MuiLink } from '@mui/material';
import { getConnectionSyncErrors, getMarketplaceConnections } from '@/services/connectionsService';
import { getAdminAccess, hasAdminAccess } from '@/lib/auth/adminAccess';
import { SYNC_RESOURCE_LABELS } from '@/lib/sync/freshness';
import { AppShell } from './app-shell';
import type { SyncWarning } from './sync-warnings-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getAdminAccess() já chama supabase.auth.getUser() — reaproveita em vez de
  // duplicar a chamada (getUser() revalida o JWT no servidor do Supabase a
  // cada vez, então não é uma leitura local barata).
  const [connections, adminAccess] = await Promise.all([getMarketplaceConnections(), getAdminAccess()]);
  const syncErrors = await getConnectionSyncErrors(connections);

  const expiredWarnings: SyncWarning[] = connections
    .filter((c) => c.status === 'expired')
    .map((c) => ({
      // expiresAt na chave: se a conexão for refeita e expirar de novo no
      // futuro, expiresAt muda e o aviso reaparece em vez de continuar oculto
      // por causa de uma dispensa antiga.
      key: `expired:${c.id}:${c.expires_at ?? 'unknown'}`,
      title: 'Conexão expirada',
      message: (
        <>
          A conta <strong>{c.label}</strong> perdeu a conexão com o Mercado Livre e não está mais sincronizando
          dados automaticamente. Os dados exibidos nas telas podem estar desatualizados.{' '}
          <MuiLink component={NextLink} href="/dashboard/conexoes">
            Reconectar agora
          </MuiLink>
          .
        </>
      ),
    }));

  // Agrupa por conexão (não por recurso): uma conexão com problema sistêmico
  // pode falhar em vários recursos ao mesmo tempo, e um alerta por recurso
  // empilharia até 6 avisos pra uma única conta quebrada.
  const syncErrorsByConnection = new Map<string, typeof syncErrors>();
  for (const err of syncErrors) {
    const list = syncErrorsByConnection.get(err.connectionId) ?? [];
    list.push(err);
    syncErrorsByConnection.set(err.connectionId, list);
  }

  const syncErrorWarnings: SyncWarning[] = [...syncErrorsByConnection.entries()].map(([connectionId, errors]) => {
    const resourceLabels = errors.map((e) => SYNC_RESOURCE_LABELS[e.resource]).join(' e ');
    // Chave composta: last_success_at muda quando volta a sincronizar com
    // sucesso e falha de novo (erro novo); o prefixo do último erro muda
    // quando a causa muda mesmo sem nunca ter tido sucesso. Sem isso, um erro
    // persistente reapareceria a cada retry de sync, ou um erro que muda de
    // causa ficaria preso atrás de uma dispensa antiga pra sempre.
    const keyParts = errors
      .map((e) => `${e.resource}:${e.lastSuccessAt ?? 'never'}:${(e.lastError ?? '').trim().slice(0, 60)}`)
      .sort();

    return {
      key: `sync-error:${connectionId}:${keyParts.join('|')}`,
      title: 'Falha ao sincronizar',
      message: (
        <>
          Os dados de <strong>{resourceLabels}</strong> da conta <strong>{errors[0].connectionLabel}</strong> não
          estão sendo sincronizados corretamente. As informações exibidas podem estar desatualizadas.
        </>
      ),
    };
  });

  const warnings = [...expiredWarnings, ...syncErrorWarnings];

  return (
    <AppShell
      userEmail={adminAccess.user?.email ?? null}
      warnings={warnings}
      showAdmin={hasAdminAccess(adminAccess)}
    >
      {children}
    </AppShell>
  );
}
