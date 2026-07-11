import { Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

export function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Button
      size="small"
      variant="outlined"
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      startIcon={<OpenInNewIcon fontSize="small" />}
    >
      {label}
    </Button>
  );
}
