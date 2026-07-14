import { getMarketplaceConnections } from '@/services/connectionsService';
import { getAdminAccess, hasAdminAccess } from '@/lib/auth/adminAccess';
import { AppShell } from './app-shell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // getAdminAccess() já chama supabase.auth.getUser() — reaproveita em vez de
  // duplicar a chamada (getUser() revalida o JWT no servidor do Supabase a
  // cada vez, então não é uma leitura local barata).
  const [connections, adminAccess] = await Promise.all([getMarketplaceConnections(), getAdminAccess()]);
  const expiredConnections = connections
    .filter((c) => c.status === 'expired')
    .map((c) => ({ id: c.id, label: c.label, expiresAt: c.expires_at }));

  return (
    <AppShell
      userEmail={adminAccess.user?.email ?? null}
      expiredConnections={expiredConnections}
      showAdmin={hasAdminAccess(adminAccess)}
    >
      {children}
    </AppShell>
  );
}
