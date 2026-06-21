'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { verifyEmail } from '@/lib/api/auth';

type State = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('No verification token found. Please click the link from your email again.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setState('success');
        // Fresh cookies with emailVerified=true are now set.
        // Give the user 2 seconds to see the success state, then go to the dashboard.
        setTimeout(() => router.push('/app'), 2000);
      })
      .catch((err: unknown) => {
        setState('error');
        const msg =
          err instanceof Error
            ? err.message
            : 'This link is invalid or has already been used.';
        setErrorMsg(msg);
      });
  }, [token, router]);

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
          {state === 'loading' && (
            <>
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-bold text-foreground">Verifying your email…</h1>
              <p className="mt-2 text-sm text-muted-foreground">Just a moment.</p>
            </>
          )}

          {state === 'success' && (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
              >
                <CheckCircle className="h-9 w-9 text-success" />
              </motion.div>
              <h1 className="text-xl font-bold text-foreground">Email verified!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account is active. Taking you to your dashboard…
              </p>
              <div className="mt-4 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
                <XCircle className="h-8 w-8 text-danger" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Verification failed</h1>
              <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-6 w-full rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface focus-ring"
              >
                Back to login
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
