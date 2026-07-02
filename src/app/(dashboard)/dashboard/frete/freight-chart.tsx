'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTheme } from '@mui/material';

export function FreightChart({ data }: { data: { bucket: string; count: number }[] }) {
  const theme = useTheme();

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.palette.divider} />
        <XAxis
          dataKey="bucket"
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={{ stroke: theme.palette.divider }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 8,
          }}
          labelStyle={{ color: theme.palette.text.primary }}
          formatter={(value) => [`${value} pedido(s)`, 'Quantidade']}
        />
        <Bar dataKey="count" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
