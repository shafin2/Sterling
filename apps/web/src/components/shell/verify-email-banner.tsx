'use client';

import { useState } from 'react';
import { MailWarning, RefreshCw, X, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMe, useResendVerification } from '@/hooks/use-me';
import { useQueryClient } from '@tanstack/react-query';
import { ME_QUERY_KEY } from '@/hooks/use-me';

export function VerifyEmailBanner() {
  const { data: me } = useMe();
  const resend = useResendVerification();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [justSent, setJustSent] = useState(false);

  // Don't render if verified, not loaded, or dismissed
  if (!me || me.isEmailVerified || dismissed) return null;

  const handleResend = () => {
    resend.mutate(me.email, {
      onSuccess: () => {
        setJustSent(true);
        setTimeout(() => setJustSent(false), 5000);
      },
    });
  };

  const handleRefresh = () => {
    void qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        <div className="flex items-center gap-3 bg-warning/10 border-b border-warning/20 px-6 py-2.5">
          <MailWarning className="h-4 w-4 shrink-0 text-warning" />

          <p className="flex-1 text-sm text-foreground">
            <span className="font-medium">Please verify your email address.</span>{' '}
            {justSent
              ? 'Verification email sent — check your inbox.'
              : `We sent a link to ${me.email}.`}
          </p>

          <div className="flex items-center gap-2 shrink-0">
            {justSent ? (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle className="h-3.5 w-3.5" />
                Sent
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={resend.isPending}
                className={cn(
                  'text-xs font-medium text-warning hover:text-warning/80 transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {resend.isPending ? 'Sending…' : 'Resend link'}
              </button>
            )}

            <button
              onClick={handleRefresh}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Check verification status"
              title="I already verified — refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
