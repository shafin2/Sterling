'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[Sterling Global Error]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'hsl(270 30% 96%)',
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '28rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '5rem',
              height: '5rem',
              borderRadius: '1.5rem',
              background: 'hsl(350 56% 54% / 0.1)',
              marginBottom: '1.5rem',
            }}
          >
            <AlertTriangle
              size={48}
              color="hsl(350 56% 54%)"
              aria-hidden="true"
            />
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'hsl(225 40% 15%)',
              marginBottom: '0.75rem',
            }}
          >
            Something went critically wrong
          </h1>

          <p
            style={{
              color: 'hsl(220 25% 40%)',
              marginBottom: '0.5rem',
              lineHeight: 1.6,
            }}
          >
            {error.message || 'A critical error occurred. Please refresh the page.'}
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                color: 'hsl(220 20% 55%)',
                marginBottom: '2rem',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}

          {!error.digest && <div style={{ marginBottom: '2rem' }} />}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                borderRadius: '0.5rem',
                background: 'hsl(225 45% 43%)',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.625rem 1.5rem',
                borderRadius: '0.5rem',
                background: 'transparent',
                color: 'hsl(225 45% 43%)',
                border: '1px solid hsl(220 30% 77%)',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem',
                textDecoration: 'none',
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
