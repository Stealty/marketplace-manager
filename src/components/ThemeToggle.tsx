'use client';

import { IconButton, Tooltip } from '@mui/material';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useColorMode } from '@/theme/ColorModeContext';

export function ThemeToggle() {
  const { mode, toggle } = useColorMode();

  return (
    <Tooltip title={mode === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}>
      <IconButton onClick={toggle} size="small" aria-label="Alternar tema">
        {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
      </IconButton>
    </Tooltip>
  );
}
