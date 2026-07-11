'use client';

import { IconButton, Tooltip } from '@mui/material';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import { useThemePreset } from '@/theme/ThemePresetContext';
import { THEME_PRESETS, THEME_PRESET_IDS } from '@/theme/tokens';

export function ThemePresetToggle() {
  const { presetId, cycle } = useThemePreset();
  const nextId = THEME_PRESET_IDS[(THEME_PRESET_IDS.indexOf(presetId) + 1) % THEME_PRESET_IDS.length];

  return (
    <Tooltip title={`Tema: ${THEME_PRESETS[presetId].label} (clique para ${THEME_PRESETS[nextId].label})`}>
      <IconButton onClick={cycle} size="small" aria-label="Alternar tema de cores">
        <PaletteOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
