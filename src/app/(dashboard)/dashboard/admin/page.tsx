import { redirect } from 'next/navigation';
import { Stack } from '@mui/material';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { getAdminAccess, hasAdminAccess } from '@/lib/auth/adminAccess';
import { listOrganizationsForAdmin } from '@/services/adminService';
import { OrgPanel } from './org-panel';
import { CreateOrgButton } from './create-org-button';

export default async function AdminPage() {
  const access = await getAdminAccess();
  const { user } = access;
  if (!user || !hasAdminAccess(access)) {
    redirect('/dashboard');
  }

  const allOrgs = await listOrganizationsForAdmin();
  const orgs = access.isSuperAdmin ? allOrgs : allOrgs.filter((org) => access.adminOrgIds.includes(org.id));

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Organização"
        title="Administração"
        subtitle={
          access.isSuperAdmin
            ? 'Gerencie organizações, membros e permissões de todo o sistema.'
            : 'Gerencie os membros e permissões da sua organização.'
        }
        action={access.isSuperAdmin ? <CreateOrgButton /> : undefined}
      />

      {orgs.length === 0 ? (
        <EmptyState message="Nenhuma organização para administrar." />
      ) : (
        <Stack spacing={2}>
          {orgs.map((org) => (
            <OrgPanel key={org.id} org={org} isSuperAdmin={access.isSuperAdmin} currentUserId={user.id} />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
