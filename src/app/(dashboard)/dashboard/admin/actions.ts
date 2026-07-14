'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { listOrgMembers, type OrgMember } from '@/services/adminService';
import type { MembershipRole } from '@/types/database';

function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SITE_URL precisa estar configurado');
  return url;
}

export async function getOrgMembers(orgId: string): Promise<{ members?: OrgMember[]; error?: string }> {
  try {
    const members = await listOrgMembers(orgId);
    return { members };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateMemberRole(
  orgId: string,
  userId: string,
  role: MembershipRole
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Mensagem melhor que o erro genérico de RLS — mas a regra em si é
  // reforçada na RLS (0018_prevent_self_role_change.sql), não só aqui, já
  // que ninguém deve poder alterar a própria role via API de jeito nenhum.
  if (user?.id === userId) {
    return { error: 'Você não pode alterar a sua própria função.' };
  }

  // RLS (is_org_admin + guards anti-escalação em 0017/0018) é a autoridade
  // real aqui — o filtro abaixo só decide o que é alcançável.
  const { data, error } = await supabase
    .from('memberships')
    .update({ role })
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Não foi possível alterar este membro.' };

  revalidatePath('/dashboard/admin');
  return {};
}

export async function removeMember(orgId: string, userId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard de UX (não é RLS): evita autoexclusão acidental da própria organização.
  if (user?.id === userId) {
    return { error: 'Você não pode remover a si mesmo.' };
  }

  const { data, error } = await supabase
    .from('memberships')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Não foi possível remover este membro.' };

  revalidatePath('/dashboard/admin');
  return {};
}

export async function inviteMember(
  orgId: string,
  email: string,
  role: MembershipRole
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // inviteUserByEmail usa o admin client (service role), que ignora RLS —
  // a permissão precisa ser conferida explicitamente antes de chamá-lo.
  const { data: canManage, error: rpcError } = await supabase.rpc('is_org_admin', { target_org_id: orgId });
  if (rpcError) return { error: rpcError.message };
  if (!canManage) return { error: 'Sem permissão para convidar membros nesta organização.' };

  if (role === 'super_admin') {
    const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('is_super_admin');
    if (superAdminError) return { error: superAdminError.message };
    if (!isSuperAdmin) return { error: 'Apenas um super-admin pode convidar outro super-admin.' };
  }

  let invitedUserId: string;
  try {
    const adminClient = createAdminClient();
    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/auth/confirm?next=/definir-senha`,
    });

    if (inviteError) return { error: inviteError.message };
    if (!invited.user) return { error: 'Não foi possível criar o convite.' };
    invitedUserId = invited.user.id;
  } catch (err) {
    return { error: (err as Error).message };
  }

  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({ org_id: orgId, user_id: invitedUserId, role });

  if (membershipError) return { error: membershipError.message };

  revalidatePath('/dashboard/admin');
  return {};
}

export async function createOrganization(name: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('organizations').insert({ name });
  if (error) return { error: error.message };

  revalidatePath('/dashboard/admin');
  return {};
}

export async function renameOrganization(orgId: string, name: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('organizations').update({ name }).eq('id', orgId).select('id');

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: 'Não foi possível renomear esta organização.' };

  revalidatePath('/dashboard/admin');
  return {};
}
