import { Avatar, type SxProps, type Theme } from '@mui/material';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';

export function ProductThumbnail({
  imageUrl,
  alt = 'Produto',
  size,
  iconFontSize,
  sx,
}: {
  imageUrl?: string | null;
  alt?: string;
  /** Largura/altura em px do Avatar. Omitido usa o tamanho padrão do MUI (40px). */
  size?: number;
  /** Tamanho do ícone de fallback: um número (px, via sx) ou uma das keywords do MUI Icon. */
  iconFontSize?: number | 'small' | 'medium' | 'large' | 'inherit';
  sx?: SxProps<Theme>;
}) {
  const dimensionSx = size ? { width: size, height: size } : undefined;

  if (imageUrl) {
    return <Avatar src={imageUrl} variant="rounded" alt={alt} sx={{ ...dimensionSx, ...sx }} />;
  }

  return (
    <Avatar variant="rounded" sx={{ ...dimensionSx, ...sx }}>
      {typeof iconFontSize === 'number' ? (
        <Inventory2OutlinedIcon sx={{ fontSize: iconFontSize }} />
      ) : (
        <Inventory2OutlinedIcon fontSize={iconFontSize} />
      )}
    </Avatar>
  );
}
