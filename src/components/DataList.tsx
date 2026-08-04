'use client';

import * as React from 'react';
import {
  Box,
  Card,
  CardContent,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
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
  /** Only relevant when hideable. Column starts hidden until the user opts in via the column picker (e.g. a field the previous app never showed). Defaults to false (visible). */
  defaultHidden?: boolean;
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
  /** Shows a list/card toggle and lets the user switch to a card grid, built from the same `columns`/`renderRowTitle`. Opt-in per screen so table-only lists stay unchanged. */
  enableCardView?: boolean;
}

function compareValues(a: string | number | null, b: string | number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

const HIDDEN_COLUMNS_CHANGE_EVENT = 'data-list-hidden-columns-change';
const VIEW_MODE_CHANGE_EVENT = 'data-list-view-mode-change';

type ViewMode = 'list' | 'card';

function hiddenColumnsStorageKey(storageKey: string) {
  return `columns-hidden:${storageKey}`;
}

function viewModeStorageKey(storageKey: string) {
  return `view-mode:${storageKey}`;
}

// null = user never touched the picker for this list; '' = user explicitly
// unhid every column. Only the former falls back to each column's `defaultHidden`.
function readStoredHiddenColumns(storageKey: string): string | null {
  return window.localStorage.getItem(hiddenColumnsStorageKey(storageKey));
}

function readStoredViewMode(storageKey: string): ViewMode | null {
  const raw = window.localStorage.getItem(viewModeStorageKey(storageKey));
  return raw === 'list' || raw === 'card' ? raw : null;
}

function getServerSnapshot() {
  return null;
}

function subscribeHiddenColumns(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(HIDDEN_COLUMNS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(HIDDEN_COLUMNS_CHANGE_EVENT, callback);
  };
}

function subscribeViewMode(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(VIEW_MODE_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(VIEW_MODE_CHANGE_EVENT, callback);
  };
}

// Mirrors the localStorage + useSyncExternalStore pattern used for the
// dark-mode preference in theme/ColorModeContext.tsx, so SSR/hydration never
// see a mismatched snapshot.
function useHiddenColumns(storageKey: string, defaultHiddenIds: string[]) {
  const getSnapshot = React.useCallback(() => readStoredHiddenColumns(storageKey), [storageKey]);
  const raw = React.useSyncExternalStore(subscribeHiddenColumns, getSnapshot, getServerSnapshot);
  const hidden = React.useMemo(
    () => new Set(raw === null ? defaultHiddenIds : raw.split(',').filter(Boolean)),
    [raw, defaultHiddenIds]
  );

  const toggle = React.useCallback(
    (columnId: string) => {
      const storedRaw = readStoredHiddenColumns(storageKey);
      const current = new Set(storedRaw === null ? defaultHiddenIds : storedRaw.split(',').filter(Boolean));
      if (current.has(columnId)) current.delete(columnId);
      else current.add(columnId);
      window.localStorage.setItem(hiddenColumnsStorageKey(storageKey), Array.from(current).join(','));
      window.dispatchEvent(new Event(HIDDEN_COLUMNS_CHANGE_EVENT));
    },
    [storageKey, defaultHiddenIds]
  );

  return { hidden, toggle };
}

function useViewMode(storageKey: string) {
  const getSnapshot = React.useCallback(() => readStoredViewMode(storageKey), [storageKey]);
  const stored = React.useSyncExternalStore(subscribeViewMode, getSnapshot, getServerSnapshot);
  const mode: ViewMode = stored ?? 'list';

  const setMode = React.useCallback(
    (next: ViewMode) => {
      window.localStorage.setItem(viewModeStorageKey(storageKey), next);
      window.dispatchEvent(new Event(VIEW_MODE_CHANGE_EVENT));
    },
    [storageKey]
  );

  return { mode, setMode };
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
  enableCardView,
}: DataListProps<T>) {
  const [sort, setSort] = React.useState(defaultSort ?? null);
  const [columnMenuAnchor, setColumnMenuAnchor] = React.useState<HTMLButtonElement | null>(null);
  const defaultHiddenIds = React.useMemo(
    () => columns.filter((column) => column.defaultHidden).map((column) => column.id),
    [columns]
  );
  const { hidden, toggle } = useHiddenColumns(storageKey, defaultHiddenIds);
  const { mode: viewMode, setMode: setViewMode } = useViewMode(storageKey);

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

  const viewToggle = enableCardView && (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={viewMode}
      onChange={(_event, next: ViewMode | null) => next && setViewMode(next)}
      aria-label="Modo de visualização"
    >
      <Tooltip title="Lista">
        <ToggleButton value="list" aria-label="Ver como lista">
          <ViewListOutlinedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
      <Tooltip title="Cards">
        <ToggleButton value="card" aria-label="Ver como cards">
          <ViewModuleOutlinedIcon fontSize="small" />
        </ToggleButton>
      </Tooltip>
    </ToggleButtonGroup>
  );

  const controls = (viewToggle || columnPicker) && (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end" sx={{ px: 1, pt: 1 }}>
      {viewToggle}
      {columnPicker}
    </Stack>
  );

  if (rows.length === 0) {
    return (
      <>
        {controls}
        <EmptyState message={emptyMessage} />
      </>
    );
  }

  if (enableCardView && viewMode === 'card') {
    return (
      <Stack>
        {controls}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 2,
            p: 1,
            ...(maxHeight !== undefined && { maxHeight, overflow: 'auto' }),
          }}
        >
          {sortedRows.map((row) => (
            <Card
              key={getRowId(row)}
              variant="outlined"
              onClick={() => onRowClick?.(row)}
              sx={{
                cursor: onRowClick ? 'pointer' : 'default',
                ...(onRowClick && { '&:hover': { boxShadow: 2 } }),
              }}
            >
              <CardContent>
                <Stack spacing={1.25}>
                  {(spanColumns.length > 0 || renderRowTitle) && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      {spanColumns.map((column) => (
                        <Box key={column.id}>{column.render(row)}</Box>
                      ))}
                      {renderRowTitle && <Box sx={{ minWidth: 0, flex: 1 }}>{renderRowTitle(row)}</Box>}
                    </Stack>
                  )}
                  <Stack spacing={0.75}>
                    {lineColumns.map((column) => (
                      <Stack
                        key={column.id}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography variant="caption" color="text.secondary">
                          {column.label}
                        </Typography>
                        <Box>{column.render(row)}</Box>
                      </Stack>
                    ))}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    );
  }

  return (
    <Stack>
      {controls}
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
