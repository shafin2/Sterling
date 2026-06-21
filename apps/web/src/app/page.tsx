'use client';

import React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  FileText, Users, Briefcase, BarChart3, Palette, Shield,
  Zap, QrCode, Mail, Clock, TrendingUp, Download,
  CheckCircle, Star, ArrowRight, Menu, X, Moon, Sun,
  Building2, DollarSign, AlertTriangle, Receipt, Sparkles,
  Play,
} from 'lucide-react';
import { useTheme } from 'next-themes';

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { theme, setTheme } = useTheme();

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrolled
          ? 'backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-sm'
          : 'bg-transparent',
      ].join(' ')}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-md group-hover:shadow-lg transition-shadow">
            <DollarSign className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Sterling</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {['Features', 'Pricing', 'How it works'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="hover:text-foreground transition-colors"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/auth/login"
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 transition-colors shadow-md"
          >
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-6 py-4 space-y-3"
          >
            {['Features', 'Pricing', 'How it works'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="block text-sm text-muted-foreground hover:text-foreground py-1.5"
                onClick={() => setOpen(false)}
              >
                {item}
              </a>
            ))}
            <div className="pt-2 border-t border-border flex gap-2">
              <Link href="/auth/login" className="flex-1 text-center rounded-lg border border-border py-2 text-sm font-medium text-foreground">
                Sign in
              </Link>
              <Link href="/auth/register" className="flex-1 text-center rounded-lg bg-primary-500 py-2 text-sm font-semibold text-white">
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Animated orb background ──────────────────────────────────────────────────

function HeroOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Top-right large orb */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.22, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -right-32 h-[600px] w-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, #7091E6 0%, transparent 70%)' }}
      />
      {/* Bottom-left orb */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.18, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, #3D52A0 0%, transparent 70%)' }}
      />
      {/* Center subtle orb */}
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.06, 0.1, 0.06] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[400px] w-[800px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, #8697C4 0%, transparent 70%)' }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(61,82,160,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(61,82,160,1) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}

// ─── Dashboard mock preview ───────────────────────────────────────────────────

function DashboardMock() {
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 68];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-2xl"
    >
      {/* Glow behind the card */}
      <div className="absolute inset-0 -z-10 rounded-3xl blur-3xl opacity-30" style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)' }} />

      {/* Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Titlebar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-surface/50">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-danger/60" />
            <div className="h-3 w-3 rounded-full bg-warning/60" />
            <div className="h-3 w-3 rounded-full bg-success/60" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            sterling.app/dashboard
          </div>
        </div>

        <div className="flex">
          {/* Sidebar strip */}
          <div className="w-10 shrink-0 border-r border-border/30 bg-sidebar/40 flex flex-col items-center gap-3 py-4">
            {[BarChart3, FileText, Users, Briefcase, Palette].map((Icon, i) => (
              <div
                key={i}
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                  i === 0 ? 'bg-accent/20 text-accent' : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
            ))}
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 space-y-3 min-w-0">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Revenue', value: '₨ 2.4M', trend: '+12%', color: 'text-success' },
                { label: 'Outstanding', value: '₨ 840K', trend: '6 inv', color: 'text-warning' },
                { label: 'Payroll', value: '₨ 1.1M', trend: 'this mo', color: 'text-accent' },
              ].map(({ label, value, trend, color }) => (
                <div key={label} className="rounded-lg border border-border/40 bg-background/60 p-2.5">
                  <p className="text-[9px] text-muted-foreground mb-1">{label}</p>
                  <p className="text-xs font-bold text-foreground tabular-nums">{value}</p>
                  <p className={`text-[9px] font-medium ${color}`}>{trend}</p>
                </div>
              ))}
            </div>

            {/* Revenue chart */}
            <div className="rounded-lg border border-border/40 bg-background/60 p-3">
              <p className="text-[9px] text-muted-foreground mb-2 font-medium">REVENUE — 2025</p>
              <div className="flex items-end gap-1 h-14">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 + i * 0.04, ease: 'easeOut' }}
                    style={{
                      height: `${h}%`,
                      originY: 1,
                      background: i === 11 ? '#3D52A0' : i >= 9 ? '#7091E6' : '#3D52A030',
                      opacity: i === 11 ? 1 : i >= 9 ? 0.5 : 1,
                    }}
                    className="flex-1 rounded-sm"
                  />
                ))}
              </div>
            </div>

            {/* Invoice rows */}
            <div className="rounded-lg border border-border/40 bg-background/60 p-2.5 space-y-1.5">
              <p className="text-[9px] text-muted-foreground font-medium mb-2">RECENT INVOICES</p>
              {[
                { no: 'INV-0042', client: 'Acme Corp', amount: '₨ 250,000', status: 'paid', color: 'bg-success text-white' },
                { no: 'INV-0041', client: 'Bluewave LLC', amount: '₨ 180,000', status: 'sent', color: 'bg-warning text-white' },
                { no: 'INV-0040', client: 'Nova Design', amount: '₨ 95,000', status: 'overdue', color: 'bg-danger text-white' },
              ].map(({ no, client, amount, status, color }) => (
                <div key={no} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-[9px] font-mono text-muted-foreground w-14 shrink-0">{no}</p>
                    <p className="text-[9px] text-foreground truncate">{client}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[9px] font-semibold text-foreground tabular-nums">{amount}</p>
                    <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${color}`}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge — top right */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 1.0 }}
        className="absolute -top-4 -right-4 flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl px-3 py-2 shadow-lg text-xs"
      >
        <Sparkles className="h-3.5 w-3.5 text-warning" />
        <span className="font-semibold text-foreground">AI-powered</span>
      </motion.div>

      {/* Floating badge — bottom left */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-border/60 bg-card/90 backdrop-blur-xl px-3 py-2 shadow-lg text-xs"
      >
        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
        <span className="font-semibold text-foreground">Payroll processed</span>
        <span className="text-muted-foreground">just now</span>
      </motion.div>
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { value: '50+', label: 'Invoices generated' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '< 2s', label: 'PDF generation' },
  { value: '∞', label: 'Tenants supported' },
];

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 overflow-hidden">
      <HeroOrbs />

      <div className="relative z-10 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left copy */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent"
          >
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered invoice & payroll platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
          >
            Invoice & Payroll,{' '}
            <span className="bg-gradient-to-r from-primary-500 to-accent-300 bg-clip-text text-transparent">
              Refined.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed max-w-lg"
          >
            Sterling is a premium multi-tenant SaaS platform for SMBs. Design branded invoices, manage
            clients & employees, run payroll, generate salary slips, and monitor financials — all from one
            beautiful dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 backdrop-blur px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface transition-all"
            >
              <Play className="h-4 w-4 text-primary" />
              View demo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/40"
          >
            {HERO_STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right — dashboard preview */}
        <div className="hidden lg:block">
          <DashboardMock />
        </div>
      </div>
    </section>
  );
}

// ─── Features grid ────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FileText,
    title: 'Smart Invoice Management',
    desc: 'Create, send, and track invoices with status flows (Draft → Sent → Paid → Overdue). Partial payments, timelines, and automatic overdue detection.',
    color: 'text-primary bg-primary/10',
  },
  {
    icon: Palette,
    title: 'WYSIWYG Invoice Designer',
    desc: 'Drag-and-drop block editor. Customize colors, fonts, layouts, logos. What you design is exactly what prints — zero drift between preview and PDF.',
    color: 'text-accent bg-accent/10',
  },
  {
    icon: Users,
    title: 'Employee Management',
    desc: 'Full employee profiles, department management, salary structures with allowances & deductions. Effective-dated history keeps records clean.',
    color: 'text-success bg-success/10',
  },
  {
    icon: Briefcase,
    title: 'Payroll Processing',
    desc: 'One-click monthly payroll runs. Salary computation, bonuses, deductions, tax rules. BullMQ jobs keep heavy work off the request thread.',
    color: 'text-warning bg-warning/10',
  },
  {
    icon: Receipt,
    title: 'Salary Slip Generation',
    desc: 'Branded salary slips rendered via the same template engine as invoices. Downloadable as PDF. Full salary history per employee.',
    color: 'text-danger bg-danger/10',
  },
  {
    icon: BarChart3,
    title: 'Financial Dashboard',
    desc: 'KPI cards with count-up animation. Revenue trend, payroll expense, AR aging buckets, top clients, upcoming dues — all in one view.',
    color: 'text-primary bg-primary/10',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6 bg-surface/30">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-1.5 text-sm text-muted-foreground mb-4">
            Core Features
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            Everything your business needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every module is production-ready, fully interactive, with loading, empty, and error states. Not a demo — a real product.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.07 }}
              className="group rounded-2xl border border-border bg-card p-6 hover:border-accent/30 hover:shadow-lg transition-all duration-200"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bonus features ───────────────────────────────────────────────────────────

const BONUS = [
  { icon: Sparkles, label: 'AI Invoice Generation', desc: 'Describe an invoice in plain English — Claude fills the line items.' },
  { icon: QrCode,   label: 'QR Code Sharing',       desc: 'Every invoice gets a QR code. Clients scan to view and pay.' },
  { icon: Mail,     label: 'Automated Email',        desc: 'Send invoices and payment reminders via email jobs automatically.' },
  { icon: Clock,    label: 'Payment Reminders',      desc: 'Configurable pre-due, on-due, and overdue reminder cadences.' },
  { icon: Shield,   label: 'Row-Level Security',     desc: 'Postgres RLS ensures tenants never see each other\'s data.' },
  { icon: Download, label: 'CSV / Excel Export',     desc: 'Export invoices, clients, employees, and payroll to spreadsheets.' },
  { icon: TrendingUp, label: 'Advanced Analytics',  desc: 'AR aging, cashflow trends, payroll expense, client profitability.' },
  { icon: Building2, label: 'Multi-Company',         desc: 'One login, multiple tenants. Switch companies instantly.' },
];

function BonusSection() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-1.5 text-sm text-warning font-medium mb-4">
            <Star className="h-3.5 w-3.5" />
            Bonus features — all included
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">
            The extras that make it exceptional
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BONUS.map(({ icon: Icon, label, desc }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="flex gap-3 rounded-xl border border-border bg-card/60 p-4 hover:bg-card transition-colors"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    step: '01',
    title: 'Register & set up your company',
    desc: 'Create your account, add your company branding — logo, colors, and tax details. Takes under 2 minutes.',
    icon: Building2,
  },
  {
    step: '02',
    title: 'Design your invoice template',
    desc: 'Use the drag-and-drop designer to create a branded invoice template. Choose themes, arrange blocks, preview in real-time.',
    icon: Palette,
  },
  {
    step: '03',
    title: 'Invoice clients & run payroll',
    desc: 'Create invoices with AI assistance, send via email, track payments. Process monthly payroll and download salary slips as PDF.',
    icon: Zap,
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-surface/30">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">How it works</h2>
          <p className="text-lg text-muted-foreground">Up and running in minutes, not days.</p>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-[calc(16.67%+1.5rem)] right-[calc(16.67%+1.5rem)] h-0.5 bg-gradient-to-r from-primary/30 via-accent/50 to-primary/30" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {STEPS.map(({ step, title, desc, icon: Icon }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.12 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg shadow-primary/30">
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-background border border-border text-[10px] font-bold text-primary">
                    {step}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    desc: 'Perfect for freelancers and solo operators.',
    features: ['Up to 20 invoices/month', '5 clients', '3 employees', 'PDF generation', 'Email delivery'],
    cta: 'Start free',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Business',
    price: '₨ 4,999',
    period: '/month',
    desc: 'For growing teams that need the full suite.',
    features: [
      'Unlimited invoices',
      'Unlimited clients & employees',
      'WYSIWYG invoice designer',
      'Payroll processing',
      'AI invoice generation',
      'QR code sharing',
      'Excel/CSV exports',
      'Audit logs',
    ],
    cta: 'Get started',
    href: '/auth/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'Multiple companies, advanced analytics, SLA.',
    features: ['Everything in Business', 'Multi-company support', 'Custom branding', 'Dedicated support', 'On-premise option'],
    cta: 'Contact us',
    href: '/auth/register',
    highlighted: false,
  },
];

function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight text-foreground mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground">No hidden fees. Cancel anytime.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {PLANS.map(({ name, price, period, desc, features, cta, href, highlighted }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={[
                'relative rounded-2xl border p-8',
                highlighted
                  ? 'border-primary/40 bg-gradient-to-b from-primary/5 to-transparent shadow-xl scale-105'
                  : 'border-border bg-card',
              ].join(' ')}
            >
              {highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-4 py-1 text-xs font-semibold text-white shadow">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-foreground mb-1">{name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{desc}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">{price}</span>
                  {period && <span className="text-sm text-muted-foreground">{period}</span>}
                </div>
              </div>
              <ul className="space-y-2.5 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                    <CheckCircle className="h-4 w-4 text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className={[
                  'block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all',
                  highlighted
                    ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-md'
                    : 'border border-border bg-background text-foreground hover:bg-surface',
                ].join(' ')}
              >
                {cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA banner ───────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-24 px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl rounded-3xl overflow-hidden relative"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-primary" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Orbs */}
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full blur-3xl bg-white/10" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full blur-3xl bg-black/10" />

        <div className="relative px-12 py-16 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to ditch the spreadsheets?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
            Join businesses using Sterling to create professional invoices, process payroll, and stay on top of their finances — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-primary-500 hover:bg-white/90 transition-all shadow-lg"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 backdrop-blur px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition-all"
            >
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
              <DollarSign className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-foreground">Sterling</span>
            <span className="text-muted-foreground text-sm ml-2">Invoice & Payroll, refined.</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <Link href="/auth/login" className="hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/auth/register" className="hover:text-foreground transition-colors">Register</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 Sterling. Built for DotCode Hackathon.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <FeaturesSection />
      <BonusSection />
      <HowItWorksSection />
      <PricingSection />
      <CtaBanner />
      <Footer />
    </div>
  );
}
