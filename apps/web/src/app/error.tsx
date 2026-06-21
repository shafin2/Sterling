'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[Sterling Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-danger/10 mb-6">
        <AlertTriangle className="h-10 w-10 text-danger" aria-hidden="true" />
      </div>

      <h1 className="text-2xl font-bold text-foreground mb-3 text-center">
        Something went wrong
      </h1>

      <p className="text-muted-foreground text-center max-w-sm mb-2 leading-relaxed">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>

      {error.digest && (
        <p className="text-xs text-muted/60 mb-8 font-mono">
          Error ID: {error.digest}
        </p>
      )}

      {!error.digest && <div className="mb-8" />}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Link href="/">
          <Button variant="outline" size="lg" className="gap-2">
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
