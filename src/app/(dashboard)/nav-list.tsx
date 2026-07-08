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

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Visão geral', icon: SpaceDashboardOutlinedIcon },
  { href: '/dashboard/perguntas', label: 'Perguntas', icon: ForumOutlinedIcon },
  { href: '/dashboard/frete', label: 'Frete', icon: LocalShippingOutlinedIcon },
  { href: '/dashboard/anuncios', label: 'Anúncios', icon: StorefrontOutlinedIcon },
  { href: '/dashboard/pedidos', label: 'Pedidos', icon: ReceiptLongOutlinedIcon },
  { href: '/dashboard/reputacao', label: 'Reputação', icon: StarOutlineOutlinedIcon },
  { href: '/dashboard/conexoes', label: 'Conexões', icon: CableOutlinedIcon },
];

export function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <List sx={{ px: 1 }}>
      {NAV_ITEMS.map((item) => {
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
