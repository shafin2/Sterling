import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Home, LogIn, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for could not be found.',
  robots: { index: false },
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-16">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mb-12 focus-ring rounded-lg">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <FileText className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="text-lg font-bold text-foreground tracking-tight">Sterling</span>
      </Link>

      {/* Icon */}
      <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-muted/20 mb-6">
        <SearchX className="h-12 w-12 text-muted" aria-hidden="true" />
      </div>

      {/* Headline */}
      <h1
        className="text-7xl sm:text-8xl font-extrabold tabular-nums mb-2"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        404
      </h1>

      <h2 className="text-xl font-bold text-foreground mb-3 text-center">Page not found</h2>
      <p className="text-muted-foreground text-center max-w-sm mb-10 leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="h-4 w-4" aria-hidden="true" />
            Go home
          </Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="outline" size="lg" className="gap-2">
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}
