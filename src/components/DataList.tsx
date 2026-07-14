'use client';

import * as React from 'react';
import {
  Checkbox,
  FormControlLabel,
  FormGroup,
  IconButton,
  Popover,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
} from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import { EmptyState } from './EmptyState';

export interface DataListColumn<T> {
  id: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: number | string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null;
  render: (row: T) => React.ReactNode;
  /** Set to false for columns essential to identifying/acting on a row (thumbnail, primary id, action control). They stay always-on and are left out of the column-visibility picker. Defaults to true. */
  hideable?: boolean;
  /** Only used together with `renderRowTitle`: this column's cell spans both lines of the row (e.g. a thumbnail next to a title line). Spanning columns must come first in the `columns` array, since both lines render them before the rest. */
  spanRows?: boolean;
}

export interface DataListProps<T> {
  columns: DataListColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage: string;
  defaultSort?: { columnId: string; direction: 'asc' | 'desc' };
  /** Bounds the table to this height and makes it scroll internally, with the column headers pinned to the top of that scroll area. Omit to let the table grow with its content. */
  maxHeight?: number | string;
  /** Scopes persisted column show/hide preferences to this list, e.g. "pedidos". */
  storageKey: string;
  /** When set, each row renders as two lines: this title spans the non-`spanRows` columns on the first line, and the regular column cells follow on the second. Columns marked `spanRows` (e.g. a thumbnail) span both lines. */
  renderRowTitle?: (row: T) => React.ReactNode;
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

const HIDDEN_COLUMNS_CHANGE_EVENT = 'data-list-hidden-columns-change';

function hiddenColumnsStorageKey(storageKey: string) {
  return `columns-hidden:${storageKey}`;
}

function readHiddenColumns(storageKey: string): string {
  return window.localStorage.getItem(hiddenColumnsStorageKey(storageKey)) ?? '';
}

function getServerSnapshot() {
  return '';
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(HIDDEN_COLUMNS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(HIDDEN_COLUMNS_CHANGE_EVENT, callback);
  };
}

// Mirrors the localStorage + useSyncExternalStore pattern used for the
// dark-mode preference in theme/ColorModeContext.tsx, so SSR/hydration never
// see a mismatched snapshot.
function useHiddenColumns(storageKey: string) {
  const getSnapshot = React.useCallback(() => readHiddenColumns(storageKey), [storageKey]);
  const raw = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hidden = React.useMemo(() => new Set(raw ? raw.split(',') : []), [raw]);

  const toggle = React.useCallback(
    (columnId: string) => {
      const current = new Set(readHiddenColumns(storageKey).split(',').filter(Boolean));
      if (current.has(columnId)) current.delete(columnId);
      else current.add(columnId);
      window.localStorage.setItem(hiddenColumnsStorageKey(storageKey), Array.from(current).join(','));
      window.dispatchEvent(new Event(HIDDEN_COLUMNS_CHANGE_EVENT));
    },
    [storageKey]
  );

  return { hidden, toggle };
}

export function DataList<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  emptyMessage,
  defaultSort,
  maxHeight,
  storageKey,
  renderRowTitle,
}: DataListProps<T>) {
  const [sort, setSort] = React.useState(defaultSort ?? null);
  const [columnMenuAnchor, setColumnMenuAnchor] = React.useState<HTMLButtonElement | null>(null);
  const { hidden, toggle } = useHiddenColumns(storageKey);

  const hideableColumns = columns.filter((column) => column.hideable !== false);
  const visibleColumns = columns.filter((column) => column.hideable === false || !hidden.has(column.id));
  const spanColumns = visibleColumns.filter((column) => column.spanRows);
  const lineColumns = visibleColumns.filter((column) => !column.spanRows);

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column) return rows;
    const accessor = column.sortValue ?? ((row: T) => (column.render(row) as string) ?? null);
    const sorted = [...rows].sort((a, b) => compareValues(accessor(a), accessor(b)));
    return sort.direction === 'asc' ? sorted : sorted.reverse();
  }, [rows, sort, columns]);

  function handleSort(columnId: string) {
    setSort((prev) => {
      if (prev?.columnId !== columnId) return { columnId, direction: 'asc' };
      return { columnId, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  }

  const columnPicker = hideableColumns.length > 0 && (
    <>
      <Tooltip title="Colunas">
        <IconButton
          size="small"
          aria-label="Escolher colunas visíveis"
          onClick={(event) => setColumnMenuAnchor(event.currentTarget)}
        >
          <ViewColumnOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(columnMenuAnchor)}
        anchorEl={columnMenuAnchor}
        onClose={() => setColumnMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <FormGroup sx={{ p: 1.5, minWidth: 200 }}>
          {hideableColumns.map((column) => (
            <FormControlLabel
              key={column.id}
              label={column.label}
              control={
                <Checkbox size="small" checked={!hidden.has(column.id)} onChange={() => toggle(column.id)} />
              }
            />
          ))}
        </FormGroup>
      </Popover>
    </>
  );

  if (rows.length === 0) {
    return (
      <>
        {columnPicker && <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}>{columnPicker}</Stack>}
        <EmptyState message={emptyMessage} />
      </>
    );
  }

  return (
    <Stack>
      {columnPicker && (
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}>
          {columnPicker}
        </Stack>
      )}
      <TableContainer sx={maxHeight !== undefined ? { maxHeight, overflow: 'auto' } : undefined}>
        <Table size="small" stickyHeader={maxHeight !== undefined}>
          <TableHead>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  width={column.width}
                  sx={maxHeight !== undefined ? { bgcolor: 'background.paper' } : undefined}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sort?.columnId === column.id}
                      direction={sort?.columnId === column.id ? sort.direction : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          {renderRowTitle
            ? sortedRows.map((row) => (
                <TableBody
                  key={getRowId(row)}
                  onClick={() => onRowClick?.(row)}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    ...(onRowClick && { '&:hover': { bgcolor: 'action.hover' } }),
                  }}
                >
                  <TableRow>
                    {spanColumns.map((column) => (
                      <TableCell key={column.id} align={column.align} rowSpan={2}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                    <TableCell colSpan={lineColumns.length}>{renderRowTitle(row)}</TableCell>
                  </TableRow>
                  <TableRow>
                    {lineColumns.map((column) => (
                      <TableCell key={column.id} align={column.align}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              ))
            : (
                <TableBody>
                  {sortedRows.map((row) => (
                    <TableRow
                      key={getRowId(row)}
                      hover={Boolean(onRowClick)}
                      onClick={() => onRowClick?.(row)}
                      sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      {visibleColumns.map((column) => (
                        <TableCell key={column.id} align={column.align}>
                          {column.render(row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              )}
        </Table>
      </TableContainer>
    </Stack>
  );
}
