'use client';

import * as React from 'react';
import { Checkbox, Tooltip } from '@mui/material';
import { toggleOrderItemConferido } from './actions';

export function ConferidoCheckbox({
  orderItemIds,
  conferido,
}: {
  orderItemIds: string[];
  conferido: boolean;
}) {
  const [checked, setChecked] = React.useState(conferido);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const next = event.target.checked;
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleOrderItemConferido(orderItemIds, next);
      if (result.error) {
        setChecked(!next);
        setError(result.error);
      }
    });
  }

  const checkbox = (
    <Checkbox
      checked={checked}
      disabled={isPending}
      onChange={handleChange}
      onClick={(event) => event.stopPropagation()}
      color={error ? 'error' : 'primary'}
    />
  );

  if (!error) return checkbox;

  return (
    <Tooltip title={error} placement="top">
      {checkbox}
    </Tooltip>
  );
}
