"use client";

import * as React from "react";
import { Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { DataList } from "@/components/DataList";
import type { OrderWithRelations } from "@/services/ordersService";
import { isAwaitingShipment } from "@/lib/mercadolivre/shippingReadiness";
import {
  CONFERENCE_COLUMNS,
  groupOrdersIntoConference,
  type ConferenceGroup,
} from "./columns";
import { OrderDetailDrawer } from "./order-detail-drawer";

type ConferidoFilter = "all" | "conferido" | "pendente";

// "Situação" deriva do envio (não do order.status, que é quase sempre 'paid'):
// espelha o recorte da conferência legada, onde o operador só via o que estava
// aguardando envio. Mantém todos os pedidos na lista por padrão ("all").
type SituacaoFilter = "all" | "aguardando_envio" | "enviados" | "cancelados";

const SITUACAO_OPTIONS: { value: SituacaoFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "aguardando_envio", label: "Aguardando envio" },
  { value: "enviados", label: "Enviados" },
  { value: "cancelados", label: "Cancelados" },
];

function matchesSituacao(order: OrderWithRelations, situacao: SituacaoFilter): boolean {
  switch (situacao) {
    case "aguardando_envio":
      return isAwaitingShipment(order);
    case "enviados":
      return order.date_shipped !== null;
    case "cancelados":
      return order.status === "cancelled" || order.status === "invalid";
    default:
      return true;
  }
}

const PAGE_BOTTOM_PADDING = 24;
const MIN_TABLE_HEIGHT = 240;

export function OrdersList({ orders }: { orders: OrderWithRelations[] }) {
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(
    null,
  );
  const [loja, setLoja] = React.useState("all");
  const [conferidoFilter, setConferidoFilter] =
    React.useState<ConferidoFilter>("all");
  const [situacao, setSituacao] = React.useState<SituacaoFilter>("all");
  const [sku, setSku] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");

  const filterBarRef = React.useRef<HTMLDivElement>(null);
  const [tableMaxHeight, setTableMaxHeight] = React.useState<number | undefined>(
    undefined,
  );

  React.useLayoutEffect(() => {
    const node = filterBarRef.current;
    if (!node) return;
    const updateMaxHeight = () => {
      const { bottom } = node.getBoundingClientRect();
      const available = window.innerHeight - bottom - PAGE_BOTTOM_PADDING;
      setTableMaxHeight(Math.max(MIN_TABLE_HEIGHT, available));
    };
    updateMaxHeight();
    const observer = new ResizeObserver(updateMaxHeight);
    observer.observe(node);
    window.addEventListener("resize", updateMaxHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateMaxHeight);
    };
  }, []);

  const groups = React.useMemo(() => groupOrdersIntoConference(orders), [orders]);

  const selected =
    groups.find((group) => group.primaryOrder.id === selectedOrderId)?.primaryOrder ?? null;

  const lojaOf = (group: ConferenceGroup) =>
    group.primaryOrder.marketplace_connections?.seller_nickname ??
    group.primaryOrder.marketplace_connections?.label;

  const lojasPresentes = React.useMemo(
    () =>
      Array.from(
        new Set(groups.map(lojaOf).filter((value): value is string => Boolean(value))),
      ),
    [groups],
  );

  const rowsMatchingOtherFilters = React.useMemo(
    () =>
      groups.filter((group) => {
        if (loja !== "all" && lojaOf(group) !== loja) return false;

        if (!matchesSituacao(group.primaryOrder, situacao)) return false;

        if (sku.trim()) {
          const query = sku.trim().toLowerCase();
          const matchesSku = group.items.some((item) =>
            (item.product_listings?.products?.sku ?? item.sku ?? "")
              .toLowerCase()
              .includes(query),
          );
          if (!matchesSku) return false;
        }

        if (dateFrom || dateTo) {
          if (!group.primaryOrder.ordered_at) return false;
          const orderedAt = new Date(group.primaryOrder.ordered_at).getTime();
          if (dateFrom && orderedAt < new Date(`${dateFrom}T00:00:00`).getTime())
            return false;
          if (dateTo && orderedAt > new Date(`${dateTo}T23:59:59`).getTime())
            return false;
        }

        return true;
      }),
    [groups, loja, situacao, sku, dateFrom, dateTo],
  );

  const totalCount = rowsMatchingOtherFilters.length;
  const conferidoCount = rowsMatchingOtherFilters.filter(
    (group) => group.allConferido,
  ).length;
  const pendenteCount = totalCount - conferidoCount;

  const filteredRows = React.useMemo(
    () =>
      rowsMatchingOtherFilters.filter((group) => {
        if (conferidoFilter === "conferido" && !group.allConferido) return false;
        if (conferidoFilter === "pendente" && group.allConferido) return false;
        return true;
      }),
    [rowsMatchingOtherFilters, conferidoFilter],
  );

  function toggleConferidoFilter(value: ConferidoFilter) {
    setConferidoFilter((prev) => (prev === value ? "all" : value));
  }

  return (
    <>
      <Stack ref={filterBarRef}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ p: 2, pt: 1 }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            select
            label="Conferido"
            size="small"
            value={conferidoFilter}
            onChange={(event) =>
              setConferidoFilter(event.target.value as ConferidoFilter)
            }
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="conferido">Conferidos</MenuItem>
            <MenuItem value="pendente">Não conferidos</MenuItem>
          </TextField>

          <TextField
            select
            label="Situação"
            size="small"
            value={situacao}
            onChange={(event) =>
              setSituacao(event.target.value as SituacaoFilter)
            }
            sx={{ minWidth: 180 }}
          >
            {SITUACAO_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Loja"
            size="small"
            value={loja}
            onChange={(event) => setLoja(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Todas</MenuItem>
            {lojasPresentes.map((l) => (
              <MenuItem key={l} value={l}>
                {l}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="SKU"
            size="small"
            placeholder="Buscar SKU"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
          />

          <TextField
            label="De"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          <TextField
            label="Até"
            type="date"
            size="small"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          sx={{ px: 2, pt: 2, pb: 2 }}
          flexWrap="wrap"
          useFlexGap
        >
          <Chip
            label={`Total: ${totalCount}`}
            size="small"
            clickable
            variant={conferidoFilter === "all" ? "filled" : "outlined"}
            onClick={() => setConferidoFilter("all")}
          />
          <Chip
            label={`Conferidos: ${conferidoCount}`}
            size="small"
            color="success"
            clickable
            variant={conferidoFilter === "conferido" ? "filled" : "outlined"}
            onClick={() => toggleConferidoFilter("conferido")}
          />
          <Chip
            label={`Não conferidos: ${pendenteCount}`}
            size="small"
            color="warning"
            clickable
            variant={conferidoFilter === "pendente" ? "filled" : "outlined"}
            onClick={() => toggleConferidoFilter("pendente")}
          />
        </Stack>
      </Stack>
      <DataList
        columns={CONFERENCE_COLUMNS}
        rows={filteredRows}
        getRowId={(group) => group.groupId}
        onRowClick={(group) => setSelectedOrderId(group.primaryOrder.id)}
        maxHeight={tableMaxHeight}
        storageKey="pedidos"
        renderRowTitle={(group) => (
          <Typography variant="body2" fontWeight={600} noWrap>
            {group.isPack
              ? `Compra com ${group.items.length} itens`
              : group.items[0]?.product_listings?.products?.title ??
                group.items[0]?.title ??
                'Item sem título'}
          </Typography>
        )}
        emptyMessage={
          groups.length === 0
            ? "Nenhum pedido sincronizado ainda."
            : "Nenhum pedido encontrado para os filtros selecionados."
        }
      />
      <OrderDetailDrawer
        order={selected}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}
