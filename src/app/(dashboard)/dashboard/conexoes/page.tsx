import { Box, Button, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader } from '@/components/PageHeader';
import { SectionPanel } from '@/components/SectionPanel';
import { StatusTag } from '@/components/StatusTag';
import { MARKETPLACE_LABELS, MARKETPLACE_TYPES } from '@/lib/marketplace';
import { getErpConnections, getMarketplaceConnections } from '@/services/connectionsService';
import type { ConnectionStatus } from '@/types/database';
import type { Tone } from '@/theme/tokens';

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

export default async function ConexoesPage() {
  const [marketplaceConnections, erpConnections] = await Promise.all([
    getMarketplaceConnections(),
    getErpConnections(),
  ]);

  const connectedTypes = new Set(marketplaceConnections.map((c) => c.marketplace));
  const missingTypes = MARKETPLACE_TYPES.filter((type) => !connectedTypes.has(type));

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
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          }}
        >
          {marketplaceConnections.map((connection) => (
            <Paper key={connection.id} variant="outlined" sx={{ p: 2.5 }}>
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {MARKETPLACE_LABELS[connection.marketplace]}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {connection.label}
                  </Typography>
                </Box>
                <StatusTag label={STATUS_LABEL[connection.status]} tone={STATUS_TONE[connection.status]} />
                <Typography variant="caption" color="text.secondary">
                  Conectado em{' '}
                  {format(new Date(connection.connected_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {connection.expires_at &&
                    ` · expira em ${format(new Date(connection.expires_at), 'd/MM/yyyy', { locale: ptBR })}`}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Em breve">
                    <span>
                      <Button size="small" variant="outlined" disabled>
                        Reconectar
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Em breve">
                    <span>
                      <Button size="small" color="error" disabled>
                        Desconectar
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}

          {missingTypes.map((type) => (
            <Paper
              key={type}
              variant="outlined"
              sx={{ p: 2.5, borderStyle: 'dashed', bgcolor: 'transparent' }}
            >
              <Stack spacing={1.5} height="100%">
                <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                  {MARKETPLACE_LABELS[type]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nenhuma conta conectada.
                </Typography>
                <Box flexGrow={1} />
                {type === 'mercado_livre' ? (
                  <Button
                    component="a"
                    href="/api/integrations/mercado-livre/authorize"
                    size="small"
                    variant="contained"
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Conectar
                  </Button>
                ) : (
                  <Tooltip title="Em breve">
                    <span>
                      <Button size="small" variant="text" disabled sx={{ alignSelf: 'flex-start' }}>
                        Conectar
                      </Button>
                    </span>
                  </Tooltip>
                )}
              </Stack>
            </Paper>
          ))}
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
                <Tooltip title="Em breve">
                  <span>
                    <Button size="small" variant="text" disabled sx={{ alignSelf: 'flex-start' }}>
                      Conectar
                    </Button>
                  </span>
                </Tooltip>
              </Stack>
            </Paper>
          )}
        </Box>
      </SectionPanel>
    </Stack>
  );
}
