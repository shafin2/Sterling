'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, DollarSign, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { RegisterSchema, type RegisterDto } from '@sterling/shared';
import { HTTPError } from 'ky';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const STEPS = ['Company', 'Account', 'Done'];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [showPwd, setShowPwd] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<RegisterDto>({ resolver: zodResolver(RegisterSchema), mode: 'onTouched' });

  const nextStep = async () => {
    const fields: (keyof RegisterDto)[][] = [
      ['companyName', 'companySlug'],
      ['firstName', 'lastName', 'email', 'password'],
    ];
    const valid = await trigger(fields[step] ?? []);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (data: RegisterDto) => {
    try {
      await api.post('auth/register', { json: data });
      setDone(true);
      setTimeout(
        () => router.push(`/auth/check-email?email=${encodeURIComponent(data.email)}`),
        1500,
      );
    } catch (err) {
      if (err instanceof HTTPError) {
        const body = await err.response.json().catch(() => ({})) as { message?: string };
        toast.error(body.message ?? `Server error (${err.response.status})`);
      } else {
        toast.error('Cannot connect to server — is the API running?');
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
      </div>

      {/* Step indicators */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
              i < step ? 'bg-success text-white' :
              i === step ? 'bg-primary text-white' :
              'bg-border text-muted-foreground',
            )}>
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className={cn('hidden sm:block text-xs', i === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-lg">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4 py-8 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Account created!</h3>
            <p className="text-sm text-muted-foreground">Sending your verification email…</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">About your company</h2>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Company name</label>
                    <Input placeholder="Acme Corp" error={!!errors.companyName} {...register('companyName')} />
                    {errors.companyName && <p className="text-xs text-danger" role="alert">{errors.companyName.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Company slug</label>
                    <Input placeholder="acme-corp" error={!!errors.companySlug} {...register('companySlug')} />
                    <p className="text-xs text-muted-foreground">Used in your workspace URL. Lowercase, no spaces.</p>
                    {errors.companySlug && <p className="text-xs text-danger" role="alert">{errors.companySlug.message}</p>}
                  </div>

                  <Button type="button" className="w-full mt-2" size="lg" onClick={nextStep}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-foreground mb-4">Your account</h2>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">First name</label>
                      <Input placeholder="John" error={!!errors.firstName} {...register('firstName')} />
                      {errors.firstName && <p className="text-xs text-danger" role="alert">{errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Last name</label>
                      <Input placeholder="Doe" error={!!errors.lastName} {...register('lastName')} />
                      {errors.lastName && <p className="text-xs text-danger" role="alert">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Work email</label>
                    <Input type="email" placeholder="john@acme.com" error={!!errors.email} {...register('email')} />
                    {errors.email && <p className="text-xs text-danger" role="alert">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Input
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        error={!!errors.password}
                        className="pr-10"
                        {...register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-ring rounded"
                        aria-label={showPwd ? 'Hide password' : 'Show password'}
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-danger" role="alert">{errors.password.message}</p>}
                  </div>

                  <div className="flex gap-3 mt-2">
                    <Button type="button" variant="outline" className="flex-1" size="lg" onClick={() => setStep(0)}>
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button type="submit" className="flex-1" size="lg" loading={isSubmitting}>
                      Create account
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        )}

        {!done && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-medium text-accent hover:underline focus-ring rounded">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </motion.div>
  );
}
