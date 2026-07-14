import { Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { StatusTag } from '@/components/StatusTag';
import { MARKETPLACE_LABELS } from '@/lib/marketplace';
import { getErpConnections, getMarketplaceConnections } from '@/services/connectionsService';
import type { ConnectionStatus, MarketplaceConnection, MarketplaceType } from '@/types/database';
import type { Tone } from '@/theme/tokens';
import { ConnectionActions } from './connection-actions';
import { ComingSoonButton } from './coming-soon-button';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Conectado',
  expired: 'Expirado',
  error: 'Erro',
  disconnected: 'Desconectado',
};

const STATUS_TONE: Record<ConnectionStatus, Tone> = {
  connected: 'success',
  expired: 'warning',
  error: 'error',
  disconnected: 'neutral',
};

// Marketplaces exibidos nesta tela — os demais valores de MarketplaceType
// seguem existindo no schema, só não têm um bloco aqui ainda.
const DISPLAYED_MARKETPLACES: MarketplaceType[] = ['mercado_livre', 'shopee', 'tiktok_shop'];

// Únicos marketplaces com fluxo de OAuth implementado hoje — os demais
// mostram só o botão "Em breve" desabilitado.
const CONNECTABLE_MARKETPLACES = new Set<MarketplaceType>(['mercado_livre']);

export default async function ConexoesPage() {
  const [marketplaceConnections, erpConnections] = await Promise.all([
    getMarketplaceConnections(),
    getErpConnections(),
  ]);

  // Uma org pode ter várias conexões do mesmo marketplace (multi-conta) —
  // agrupa por tipo para renderizar um único bloco por marketplace, com todas
  // as contas conectadas e a ação de conectar mais uma juntas (em vez de um
  // grid onde a conexão existente e o tile de "conectar" apareciam soltos).
  const connectionsByType = new Map<MarketplaceType, MarketplaceConnection[]>();
  for (const connection of marketplaceConnections) {
    const list = connectionsByType.get(connection.marketplace) ?? [];
    list.push(connection);
    connectionsByType.set(connection.marketplace, list);
  }

  return (
    <Stack spacing={3}>
      <PageHeader
        kicker="Integrações"
        title="Conexões"
        subtitle="Contas de marketplace e ERP conectadas a este workspace."
      />

      <SectionPanel kicker="Marketplaces" title="Contas conectadas">
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
            alignItems: 'start',
          }}
        >
          {DISPLAYED_MARKETPLACES.map((type) => {
            const connections = connectionsByType.get(type) ?? [];
            const connectable = CONNECTABLE_MARKETPLACES.has(type);

            return (
              <Paper key={type} variant="outlined" sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {MARKETPLACE_LABELS[type]}
                  </Typography>

                  {connections.length > 0 ? (
                    <Stack divider={<Divider />} spacing={2}>
                      {connections.map((connection) => (
                        <Stack key={connection.id} spacing={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={600}>
                              {connection.seller_nickname ?? connection.label}
                            </Typography>
                            <StatusTag label={STATUS_LABEL[connection.status]} tone={STATUS_TONE[connection.status]} />
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            Conectado em{' '}
                            {format(new Date(connection.connected_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            {connection.expires_at &&
                              ` · expira em ${format(new Date(connection.expires_at), 'd/MM/yyyy', { locale: ptBR })}`}
                          </Typography>
                          <ConnectionActions connectionId={connection.id} />
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      Nenhuma conta conectada.
                    </Typography>
                  )}

                  {connectable ? (
                    <Button
                      component="a"
                      href="/api/integrations/mercado-livre/authorize"
                      size="small"
                      variant={connections.length > 0 ? 'outlined' : 'contained'}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      {connections.length > 0 ? 'Adicionar outra conta' : 'Conectar'}
                    </Button>
                  ) : (
                    <ComingSoonButton />
                  )}
                </Stack>
              </Paper>
            );
          })}
        </Box>
      </SectionPanel>

      <SectionPanel kicker="ERP" title="Integração com ERP">
        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {erpConnections.map((connection) => (
            <Paper key={connection.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {connection.provider}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {connection.label}
                  </Typography>
                </Box>
                <StatusTag label={STATUS_LABEL[connection.status]} tone={STATUS_TONE[connection.status]} />
              </Stack>
            </Paper>
          ))}

          {erpConnections.length === 0 && (
            <Paper variant="outlined" sx={{ p: 2.5, borderStyle: 'dashed', bgcolor: 'transparent' }}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                  Bling
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nenhum ERP conectado.
                </Typography>
                <ComingSoonButton />
              </Stack>
            </Paper>
          )}
        </Box>
      </SectionPanel>
    </Stack>
  );
}
