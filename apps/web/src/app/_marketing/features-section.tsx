'use client';

import { motion } from 'framer-motion';
import {
  FileText,
  Users,
  Palette,
  DollarSign,
  BarChart3,
  Shield,
  Zap,
  Globe,
} from 'lucide-react';

const FEATURES = [
  {
    icon: FileText,
    title: 'Smart Invoicing',
    description:
      'Create professional invoices in seconds. Automated numbering, line items, taxes, discounts, and PDF generation. Share via email or QR code.',
  },
  {
    icon: DollarSign,
    title: 'Payroll Engine',
    description:
      'Process payroll end-to-end — compute salaries, allowances, deductions, and taxes. Branded salary slips delivered automatically.',
  },
  {
    icon: Palette,
    title: 'WYSIWYG Designer',
    description:
      'Drag-and-drop invoice templates that look exactly how they print. Brand your documents with your logo, colors, and fonts.',
  },
  {
    icon: Users,
    title: 'Client & Employee Hub',
    description:
      'Centralised records for clients and employees. Track outstanding balances, salary history, and documents in one place.',
  },
  {
    icon: BarChart3,
    title: 'Financial Dashboard',
    description:
      'Real-time KPIs, revenue charts, cashflow analysis, and aging reports. Drill down to any invoice or payroll run.',
  },
  {
    icon: Shield,
    title: 'Multi-Tenant Security',
    description:
      'Row-level security and RBAC keep every tenant\'s data completely isolated. Owner, admin, accountant, HR, and viewer roles.',
  },
  {
    icon: Zap,
    title: 'Automated Reminders',
    description:
      'Schedule pre-due, on-due, and overdue payment reminders. Never chase an invoice manually again.',
  },
  {
    icon: Globe,
    title: 'Multi-Currency & Tax',
    description:
      'Configurable tax rules per tenant, multi-currency invoicing, and Excel/CSV exports for your accountant.',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-background">
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
            Everything you need
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Built for serious businesses
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One platform to invoice clients, run payroll, design branded documents, and understand your
            finances — without juggling five tools.
          </p>
        </motion.div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="group rounded-2xl border border-border bg-card p-6 hover:border-accent/50 hover:shadow-md transition-all duration-200"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
