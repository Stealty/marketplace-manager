import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Membership, Organization } from '@/types/database';

export interface OrgMember extends Membership {
  email: string | null;
}

export async function listOrganizationsForAdmin(): Promise<Organization[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('organizations').select('*').order('name');

  if (error) throw error;
  return data;
}

// memberships só guarda user_id — is_org_admin() confirma que o chamador pode
// administrar orgId antes de sair da RLS para resolver e-mails, já que o
// admin client (service role) ignora RLS por completo. is_super_admin() do
// próprio chamador também é checada aqui, pra decidir se membros super-admin
// devem ser filtrados da resposta (ver comentário abaixo).
async function getCallerAccess(orgId: string): Promise<{ isOrgAdmin: boolean; isSuperAdmin: boolean }> {
  const supabase = await createClient();

  const [orgAdminResult, superAdminResult] = await Promise.all([
    supabase.rpc('is_org_admin', { target_org_id: orgId }),
    supabase.rpc('is_super_admin'),
  ]);

  if (orgAdminResult.error) throw orgAdminResult.error;
  if (superAdminResult.error) throw superAdminResult.error;

  return { isOrgAdmin: orgAdminResult.data === true, isSuperAdmin: superAdminResult.data === true };
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { isOrgAdmin, isSuperAdmin } = await getCallerAccess(orgId);
  if (!isOrgAdmin) throw new Error('Sem permissão para administrar esta organização.');

  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at');

  if (error) throw error;

  // Um admin comum não pode alterar/remover a membership de um super-admin
  // (RLS já bloqueia isso em 0017_admin_panel.sql) — mas também não deve nem
  // enxergar que a linha existe, então ela é removida aqui, antes de sair
  // para o client, em vez de só ser desabilitada na UI.
  const visible = isSuperAdmin ? memberships : memberships.filter((m) => m.role !== 'super_admin');

  const adminClient = createAdminClient();
  return Promise.all(
    visible.map(async (membership) => {
      const { data } = await adminClient.auth.admin.getUserById(membership.user_id);
      return { ...membership, email: data.user?.email ?? null };
    })
  );
}
