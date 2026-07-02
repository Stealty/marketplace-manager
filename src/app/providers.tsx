'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ThemeRegistry from '@/theme/ThemeRegistry';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeRegistry>{children}</ThemeRegistry>
    </QueryClientProvider>
  );
}
