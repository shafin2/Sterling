'use client';

import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { getQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-right"
          expand
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast: 'font-sans',
              title: 'font-semibold',
            },
          }}
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
