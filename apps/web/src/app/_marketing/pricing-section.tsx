'use client';

import { motion } from 'framer-motion';
import { Check, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const PLANS = [
  {
    name: 'Starter',
    price: '$29',
    period: '/mo',
    description: 'For freelancers and small teams getting started.',
    highlighted: false,
    cta: 'Start free trial',
    features: [
      'Up to 3 team members',
      '50 invoices / month',
      'Basic invoice templates',
      'Client & employee records',
      'PDF generation',
      'Email delivery',
    ],
  },
  {
    name: 'Growth',
    price: '$79',
    period: '/mo',
    description: 'The full platform for growing businesses.',
    highlighted: true,
    badge: 'Most popular',
    cta: 'Start free trial',
    features: [
      'Unlimited team members',
      'Unlimited invoices',
      'WYSIWYG designer + custom branding',
      'Full payroll engine',
      'Automated reminders',
      'Advanced analytics & reports',
      'CSV / Excel exports',
      'AI invoice generation',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Tailored for large organisations with advanced needs.',
    highlighted: false,
    cta: 'Talk to us',
    features: [
      'Everything in Growth',
      'Dedicated onboarding',
      'SLA guarantee',
      'Custom integrations',
      'Audit log retention',
      'SSO / SAML',
    ],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 bg-surface">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            Simple pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            No surprises, ever
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free for 14 days. No credit card required. Upgrade or cancel anytime.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-2xl border p-8 ${
                plan.highlighted
                  ? 'border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/20 scale-[1.03] z-10'
                  : 'border-border bg-card shadow-sm'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-accent px-4 py-1 text-xs font-bold text-accent-foreground shadow-sm">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3
                  className={`text-lg font-bold mb-1 ${
                    plan.highlighted ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm mb-5 ${
                    plan.highlighted ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  }`}
                >
                  {plan.description}
                </p>
                <div className="flex items-end gap-1">
                  <span
                    className={`text-4xl font-extrabold tabular-nums ${
                      plan.highlighted ? 'text-primary-foreground' : 'text-foreground'
                    }`}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={`text-sm mb-1.5 ${
                        plan.highlighted ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>
              </div>

              <Link href={plan.name === 'Enterprise' ? 'mailto:hello@sterling.app' : '/auth/register'}>
                <Button
                  className="w-full mb-8"
                  variant={plan.highlighted ? 'accent' : 'outline'}
                  size="lg"
                >
                  {plan.cta}
                </Button>
              </Link>

              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        plan.highlighted ? 'text-primary-foreground/80' : 'text-success'
                      }`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-sm ${
                        plan.highlighted ? 'text-primary-foreground/90' : 'text-muted-foreground'
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
