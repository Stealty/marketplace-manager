'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import CableOutlinedIcon from '@mui/icons-material/CableOutlined';
import StarOutlineOutlinedIcon from '@mui/icons-material/StarOutlineOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Visão geral', icon: SpaceDashboardOutlinedIcon },
  { href: '/dashboard/perguntas', label: 'Perguntas', icon: ForumOutlinedIcon },
  { href: '/dashboard/frete', label: 'Frete', icon: LocalShippingOutlinedIcon },
  { href: '/dashboard/anuncios', label: 'Anúncios', icon: StorefrontOutlinedIcon },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: ReceiptLongOutlinedIcon },
  { href: '/dashboard/reclamacoes', label: 'Reclamações', icon: ReportProblemOutlinedIcon },
  { href: '/dashboard/lucratividade', label: 'Lucratividade', icon: TrendingUpOutlinedIcon },
  { href: '/dashboard/reputacao', label: 'Reputação', icon: StarOutlineOutlinedIcon },
  { href: '/dashboard/conexoes', label: 'Conexões', icon: CableOutlinedIcon },
];

const ADMIN_NAV_ITEM = { href: '/dashboard/admin', label: 'Administração', icon: AdminPanelSettingsOutlinedIcon };

export function NavList({ onNavigate, showAdmin }: { onNavigate?: () => void; showAdmin: boolean }) {
  const pathname = usePathname();
  const items = showAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <List sx={{ px: 1 }}>
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <ListItemButton
            key={item.href}
            component={Link}
            href={item.href}
            onClick={onNavigate}
            selected={active}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              borderLeft: '3px solid',
              borderLeftColor: active ? 'primary.main' : 'transparent',
              '&.Mui-selected': {
                bgcolor: 'action.selected',
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: active ? 'primary.main' : 'text.secondary' }}>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              slotProps={{ primary: { fontWeight: active ? 700 : 500 } }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}
