'use client';

import { Button, Tooltip } from '@mui/material';

export function ComingSoonButton() {
  return (
    <Tooltip title="Em breve">
      <span>
        <Button size="small" variant="text" disabled sx={{ alignSelf: 'flex-start' }}>
          Conectar
        </Button>
      </span>
    </Tooltip>
  );
}
