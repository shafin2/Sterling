'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, RefreshCw, ArrowLeft, CheckCircle, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { resendVerification } from '@/lib/api/auth';

function CheckEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const email = params.get('email') ?? '';

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setSending(true);
    setError('');
    try {
      await resendVerification(email);
      setSent(true);
      setTimeout(() => setSent(false), 6000);
    } catch {
      setError('Failed to resend. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-md">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Sterling</span>
        </div>

        <div className="rounded-2xl border border-border bg-background p-8 shadow-sm text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-foreground">Check your inbox</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            We sent a verification link to
          </p>
          {email && (
            <p className="mt-1 font-semibold text-foreground text-sm break-all">{email}</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Click the link in that email to activate your account.
          </p>

          {/* Steps */}
          <div className="mt-6 rounded-xl bg-surface p-4 text-left space-y-3">
            {[
              'Open the email from Sterling',
              'Click "Verify my email"',
              'You\'ll be taken to your dashboard',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground">{step}</span>
              </div>
            ))}
          </div>

          {/* Resend */}
          <div className="mt-6">
            {sent ? (
              <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-success">
                <CheckCircle className="h-4 w-4" />
                New link sent — check your inbox
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Didn&apos;t get the email?{' '}
                <button
                  onClick={handleResend}
                  disabled={sending || !email}
                  className={cn(
                    'font-medium text-accent hover:underline focus-ring rounded',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline',
                  )}
                >
                  {sending ? (
                    <span className="inline-flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    'Resend link'
                  )}
                </button>
              </p>
            )}
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Also check your <span className="font-medium">spam / junk</span> folder.
          </p>
        </div>

        <button
          onClick={() => router.push('/auth/login')}
          className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg py-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to login
        </button>
      </motion.div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
