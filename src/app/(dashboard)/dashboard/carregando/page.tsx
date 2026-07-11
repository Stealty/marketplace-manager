import { redirect } from 'next/navigation';
import { SyncProgressScreen } from './sync-progress-screen';

export default async function CarregandoPage({
  searchParams,
}: {
  searchParams: Promise<{ conexao?: string }>;
}) {
  const { conexao } = await searchParams;
  if (!conexao) redirect('/dashboard');

  return <SyncProgressScreen connectionId={conexao} />;
}
