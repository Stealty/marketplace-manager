import { createTheme, type Theme } from '@mui/material/styles';
import { THEME_PRESETS, type ColorMode, type ThemePresetId } from './tokens';

const BODY_FONT = 'var(--font-body), system-ui, sans-serif';

export function getTheme(mode: ColorMode, presetId: ThemePresetId = 'terracota'): Theme {
  const preset = THEME_PRESETS[presetId];
  const t = preset[mode];
  const HEADING_FONT = `var(${preset.headingFontVar}), Georgia, serif`;

  return createTheme({
    palette: {
      mode,
      primary: { main: t.accent, contrastText: t.accentContrast },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
      background: { default: t.background, paper: t.panel },
      text: { primary: t.text, secondary: t.textSecondary },
      divider: t.border,
    },
    shape: { borderRadius: t.radius },
    typography: {
      fontFamily: BODY_FONT,
      h1: { fontFamily: HEADING_FONT },
      h2: { fontFamily: HEADING_FONT },
      h3: { fontFamily: HEADING_FONT },
      h4: { fontFamily: HEADING_FONT, fontWeight: 600 },
      h5: { fontFamily: HEADING_FONT, fontWeight: 600 },
      h6: { fontFamily: HEADING_FONT, fontWeight: 600 },
    },
    components: {
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${t.border}`,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderBottom: `1px solid ${t.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            backgroundColor: t.panelAlt,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: t.radius, textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: t.radius / 2 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: { colorScheme: mode },
        },
      },
    },
  });
}
