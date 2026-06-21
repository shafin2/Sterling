'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { GuestSupportChat } from '@/components/support/guest-support-chat';
import { motion, useScroll, useTransform, AnimatePresence, useInView } from 'framer-motion';
import { HeroCanvasLoader } from './_marketing/hero-canvas-loader';
import { TestimonialsSection } from './_marketing/testimonials-section';
import {
  FileText, Users, Briefcase, BarChart3, Palette, Shield,
  Zap, QrCode, Mail, Clock, TrendingUp, Download,
  CheckCircle, Star, ArrowRight, Menu, X, Moon, Sun,
  Building2, DollarSign, AlertTriangle, Receipt, Sparkles,
  Github, Twitter, Linkedin, ChevronUp, Play, Layers,
  CreditCard, Lock, Globe, Activity,
} from 'lucide-react';
import { useTheme } from 'next-themes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCountUp(end: number, duration = 1.5, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const frame = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / (duration * 1000), 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [end, duration, start]);
  return count;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = ['Features', 'Pricing', 'How it works'];

  return (
    <header
      className={[
        'fixed top-0 inset-x-0 z-50 transition-all duration-500',
        scrolled
          ? 'backdrop-blur-2xl bg-background/80 border-b border-border/50 shadow-sm shadow-black/5'
          : 'bg-transparent',
      ].join(' ')}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.08, rotate: -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary shadow-md"
          >
            <DollarSign className="h-4 w-4 text-white" />
          </motion.div>
          <span className="text-lg font-bold tracking-tight text-foreground">Sterling</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all duration-150"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all"
            aria-label="Toggle theme"
          >
            {mounted && resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            href="/auth/login"
            className="hidden md:inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all"
          >
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent transition-all shadow-md hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px"
          >
            Get Started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface/60 transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="h-5 w-5" /></motion.span>
                : <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="h-5 w-5" /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="md:hidden overflow-hidden border-t border-border bg-background/98 backdrop-blur-xl"
          >
            <div className="px-6 py-5 space-y-1">
              {navLinks.map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                  onClick={() => setOpen(false)}
                >
                  {item}
                </a>
              ))}
              <div className="pt-3 border-t border-border flex gap-2">
                <Link href="/auth/login" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground hover:bg-surface transition-colors">
                  Sign in
                </Link>
                <Link href="/auth/register" onClick={() => setOpen(false)} className="flex-1 text-center rounded-xl bg-primary py-2.5 text-sm font-semibold text-white">
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Orb background ───────────────────────────────────────────────────────────

function HeroOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -right-40 h-[700px] w-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, #7091E6 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.08, 0.16, 0.08] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-40 -left-40 h-[600px] w-[600px] rounded-full"
        style={{ background: 'radial-gradient(circle, #3D52A0 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.05, 1], opacity: [0.05, 0.1, 0.05] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[900px] rounded-full"
        style={{ background: 'radial-gradient(ellipse, #8697C4 0%, transparent 70%)' }}
      />
      <div
        className="absolute inset-0 opacity-[0.025] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(rgba(61,82,160,1) 1px, transparent 1px), linear-gradient(90deg, rgba(61,82,160,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}

// ─── Dashboard mock ────────────────────────────────────────────────────────────

function DashboardMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const revenue = useCountUp(2400000, 1.4, inView);
  const outstanding = useCountUp(840000, 1.4, inView);
  const payroll = useCountUp(1100000, 1.4, inView);

  const bars = [38, 55, 42, 78, 52, 88, 67, 82, 58, 73, 91, 65];

  const fmt = (n: number) =>
    n >= 1000000
      ? `₨ ${(n / 1000000).toFixed(1)}M`
      : `₨ ${(n / 1000).toFixed(0)}K`;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative mx-auto max-w-2xl"
    >
      {/* Glow */}
      <motion.div
        animate={{ opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -inset-4 -z-10 rounded-3xl blur-3xl"
        style={{ background: 'linear-gradient(135deg, #3D52A0, #7091E6)' }}
      />

      {/* Card */}
      <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Titlebar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-surface/40">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-danger/70" />
            <div className="h-3 w-3 rounded-full bg-warning/70" />
            <div className="h-3 w-3 rounded-full bg-success/70" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md bg-background/60 px-3 py-1 text-[11px] text-muted-foreground font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse inline-block" />
            app.sterling.io/dashboard
          </div>
        </div>

        <div className="flex">
          {/* Sidebar strip */}
          <div className="w-12 shrink-0 border-r border-border/20 bg-sidebar/50 flex flex-col items-center gap-2.5 py-4">
            {([BarChart3, FileText, Users, Briefcase, Palette, Shield] as React.ComponentType<{ className?: string }>[]).map((Icon, i) => (
              <div
                key={i}
                className={[
                  'flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                  i === 0 ? 'bg-accent/20 text-accent' : 'text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-white/5',
                ].join(' ')}
              >
                <Icon className="h-4 w-4" />
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="flex-1 p-4 space-y-3 min-w-0">
            {/* KPI row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Revenue', value: fmt(revenue), raw: revenue, trend: '+12%', color: 'text-success', bg: 'bg-success/10' },
                { label: 'Outstanding', value: fmt(outstanding), raw: outstanding, trend: '6 inv', color: 'text-warning', bg: 'bg-warning/10' },
                { label: 'Payroll', value: fmt(payroll), raw: payroll, trend: 'this mo', color: 'text-accent', bg: 'bg-accent/10' },
              ].map(({ label, value, trend, color, bg }) => (
                <div key={label} className="rounded-xl border border-border/30 bg-background/70 p-3">
                  <div className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${bg} mb-2`}>
                    <Activity className={`h-3 w-3 ${color}`} />
                  </div>
                  <p className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wide">{label}</p>
                  <p className="text-xs font-bold text-foreground tabular-nums">{value}</p>
                  <p className={`text-[9px] font-semibold mt-0.5 ${color}`}>{trend}</p>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="rounded-xl border border-border/30 bg-background/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Revenue — 2025</p>
                <span className="text-[9px] font-semibold text-success bg-success/10 rounded-full px-1.5 py-0.5">+24% YoY</span>
              </div>
              <div className="flex items-end gap-0.5 h-12">
                {bars.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={inView ? { scaleY: 1 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 + i * 0.04, ease: 'easeOut' }}
                    style={{
                      height: `${h}%`,
                      originY: 1,
                      background: i === 11 ? 'linear-gradient(to top, #3D52A0, #7091E6)' : i >= 9 ? '#7091E680' : '#3D52A025',
                    }}
                    className="flex-1 rounded-sm"
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'].map((m) => (
                  <span key={m} className="text-[8px] text-muted-foreground/60">{m}</span>
                ))}
              </div>
            </div>

            {/* Invoice rows */}
            <div className="rounded-xl border border-border/30 bg-background/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Recent Invoices</p>
                <span className="text-[9px] text-primary font-medium cursor-pointer">View all →</span>
              </div>
              <div className="space-y-1.5">
                {[
                  { no: 'INV-0042', client: 'Acme Corp', amount: '₨ 250K', status: 'paid', color: 'bg-success/15 text-success' },
                  { no: 'INV-0041', client: 'Bluewave LLC', amount: '₨ 180K', status: 'sent', color: 'bg-warning/15 text-warning' },
                  { no: 'INV-0040', client: 'Nova Design', amount: '₨ 95K', status: 'overdue', color: 'bg-danger/15 text-danger' },
                ].map(({ no, client, amount, status, color }) => (
                  <div key={no} className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[9px] font-mono text-muted-foreground/70 shrink-0">{no}</span>
                      <span className="text-[9px] text-foreground truncate">{client}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[9px] font-bold text-foreground tabular-nums">{amount}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${color}`}>{status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating badges */}
      {[
        { delay: 0.9, pos: '-top-5 -right-5', content: <><Sparkles className="h-3.5 w-3.5 text-warning" /><span className="font-semibold text-foreground text-xs">AI-powered</span></> },
        { delay: 1.1, pos: '-bottom-5 -left-5', content: <><span className="h-2 w-2 rounded-full bg-success animate-pulse inline-block" /><span className="font-semibold text-foreground text-xs">Payroll processed</span><span className="text-muted-foreground text-xs">just now</span></> },
        { delay: 1.3, pos: 'top-16 -right-8', content: <><CreditCard className="h-3.5 w-3.5 text-accent" /><span className="text-xs font-semibold text-foreground">Payment received</span></> },
      ].map(({ delay, pos, content }, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay }}
          className={`absolute ${pos} flex items-center gap-2 rounded-xl border border-border/60 bg-card/95 backdrop-blur-xl px-3 py-2 shadow-xl`}
        >
          {content}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, -80]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-20 overflow-hidden">
      <HeroOrbs />
      <HeroCanvasLoader />

      <motion.div style={{ y, opacity }} className="relative z-10 mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Copy */}
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
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
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-5xl lg:text-[3.75rem] font-bold tracking-tight text-foreground leading-[1.08]"
          >
            Invoice & Payroll,{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Refined.</span>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent origin-left rounded-full"
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-lg text-muted-foreground leading-relaxed max-w-lg"
          >
            Sterling is a premium multi-tenant SaaS for SMBs. Design branded invoices, manage clients & employees, run payroll, generate salary slips, and monitor financials — all from one beautiful dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-wrap gap-3"
          >
            <Link
              href="/auth/register"
              className="group inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/30 hover:bg-accent transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/25"
            >
              Start for free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/80 backdrop-blur px-7 py-3.5 text-sm font-semibold text-foreground hover:bg-surface hover:border-accent/40 transition-all"
            >
              <Play className="h-4 w-4 text-primary fill-primary" />
              View demo
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-5 border-t border-border/40"
          >
            {[
              { value: '50+', label: 'Invoices generated' },
              { value: '99.9%', label: 'Uptime SLA' },
              { value: '< 2s', label: 'PDF generation' },
              { value: '∞', label: 'Tenants supported' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-2xl font-extrabold text-foreground tabular-nums tracking-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dashboard */}
        <div className="hidden lg:block">
          <DashboardMock />
        </div>
      </motion.div>
    </section>
  );
}

// ─── Trust bar ────────────────────────────────────────────────────────────────

function TrustBar() {
  const companies = ['Acme Corp', 'Bluewave', 'Nova Design', 'Meridian', 'Volta Consulting', 'Novatek Ltd'];
  return (
    <section className="py-14 border-y border-border/40 bg-surface/20">
      <div className="mx-auto max-w-7xl px-6">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 mb-8"
        >
          Trusted by teams at
        </motion.p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {companies.map((name, i) => (
            <motion.span
              key={name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="text-base font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors cursor-default select-none tracking-tight"
            >
              {name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES_HERO = [
  {
    icon: FileText,
    title: 'Smart Invoice Management',
    desc: 'Create, send, and track invoices with full status flows — Draft → Sent → Paid → Overdue. Partial payments, activity timelines, and automatic overdue detection built in.',
    color: 'text-primary bg-primary/10',
    mockBg: 'from-primary/5 to-accent/5',
    mock: (
      <div className="space-y-2 p-4">
        {[
          { id: 'INV-0042', client: 'Acme Corp', amount: '₨ 250,000', badge: 'Paid', bc: 'bg-success/15 text-success' },
          { id: 'INV-0041', client: 'Bluewave LLC', amount: '₨ 180,000', badge: 'Sent', bc: 'bg-warning/15 text-warning' },
          { id: 'INV-0040', client: 'Nova Design', amount: '₨ 95,000', badge: 'Overdue', bc: 'bg-danger/15 text-danger' },
        ].map((row) => (
          <div key={row.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/60 px-3 py-2.5">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">{row.client}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{row.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-foreground tabular-nums">{row.amount}</span>
              <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${row.bc}`}>{row.badge}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Palette,
    title: 'WYSIWYG Invoice Designer',
    desc: 'Drag-and-drop block editor for branded invoice templates. Customize colors, fonts, layouts, logos. What you design is exactly what prints — zero drift between preview and PDF.',
    color: 'text-accent bg-accent/10',
    mockBg: 'from-accent/5 to-primary/5',
    mock: (
      <div className="p-4 space-y-3">
        <div className="rounded-lg border-2 border-dashed border-accent/30 bg-accent/5 p-4 text-center">
          <Palette className="h-8 w-8 text-accent mx-auto mb-2" />
          <p className="text-xs font-semibold text-foreground">Drag blocks to design</p>
          <p className="text-[10px] text-muted-foreground">Header · Line items · Totals · Footer</p>
        </div>
        <div className="flex gap-2">
          {['#3D52A0', '#7091E6', '#2E9E7B', '#D99A4E'].map((c) => (
            <div key={c} className="h-6 flex-1 rounded-md border border-border/40" style={{ background: c }} />
          ))}
        </div>
        <div className="rounded-lg border border-border/40 bg-background/60 p-3">
          <p className="text-[9px] text-muted-foreground mb-1">Preview</p>
          <div className="h-12 rounded bg-surface/60 flex items-center justify-center">
            <p className="text-[10px] text-muted-foreground">Live PDF preview</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Briefcase,
    title: 'Payroll Processing',
    desc: 'One-click monthly payroll runs with salary computation, bonuses, deductions, and tax rules. BullMQ jobs keep heavy computation off the request thread.',
    color: 'text-warning bg-warning/10',
    mockBg: 'from-warning/5 to-success/5',
    mock: (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/60 p-3">
          <div>
            <p className="text-xs font-bold text-foreground">June 2025 Payroll</p>
            <p className="text-[10px] text-muted-foreground">24 employees · ₨ 4.8M</p>
          </div>
          <span className="text-[10px] font-bold rounded-full bg-success/15 text-success px-2 py-1">Processed</span>
        </div>
        {['Ahmad Raza', 'Sara Khan', 'Bilal Ahmed'].map((name) => (
          <div key={name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-bold text-primary">{name[0]}</div>
              <span className="text-[10px] text-foreground">{name}</span>
            </div>
            <span className="text-[10px] font-bold text-foreground tabular-nums">₨ 200K</span>
          </div>
        ))}
      </div>
    ),
  },
];

const FEATURES_GRID = [
  { icon: Users, title: 'Employee Management', desc: 'Full employee profiles, department management, salary structures with allowances & deductions. Effective-dated history keeps records clean.', color: 'text-success bg-success/10' },
  { icon: Receipt, title: 'Salary Slip PDFs', desc: 'Branded salary slips via the same template engine as invoices. Downloadable as PDF. Full salary history per employee.', color: 'text-danger bg-danger/10' },
  { icon: BarChart3, title: 'Financial Dashboard', desc: 'KPI cards with count-up animations. Revenue trend, AR aging, top clients, and upcoming dues — all in one view.', color: 'text-primary bg-primary/10' },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-28 lg:py-36 px-6 bg-surface/20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            <Layers className="h-3.5 w-3.5" />
            Core Features
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-5">
            Everything your business needs
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every module is production-ready with loading, empty, and error states. Not a demo — a real product.
          </p>
        </motion.div>

        {/* Alternating feature rows */}
        <div className="space-y-16 mb-16">
          {FEATURES_HERO.map(({ icon: Icon, title, desc, color, mockBg, mock }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}
            >
              <div className={`space-y-5 ${i % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold text-foreground tracking-tight">{title}</h3>
                <p className="text-base text-muted-foreground leading-relaxed">{desc}</p>
                <Link href="/auth/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent transition-colors">
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className={`${i % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`}>
                <div className={`rounded-2xl border border-border/60 bg-gradient-to-br ${mockBg} overflow-hidden shadow-sm`}>
                  {mock}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Grid for remaining */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {FEATURES_GRID.map(({ icon: Icon, title, desc, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-border bg-card p-6 hover:border-accent/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl mb-4 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-base">{title}</h3>
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
  { icon: Sparkles, label: 'AI Invoice Generation', desc: 'Describe an invoice in plain English — Claude fills line items instantly.', color: 'from-primary/20 to-accent/10 text-primary' },
  { icon: QrCode, label: 'QR Code Sharing', desc: 'Every invoice gets a QR code. Clients scan to view and pay.', color: 'from-accent/20 to-primary/10 text-accent' },
  { icon: Mail, label: 'Automated Email', desc: 'Send invoices and payment reminders via email jobs automatically.', color: 'from-success/20 to-accent/10 text-success' },
  { icon: Clock, label: 'Payment Reminders', desc: 'Configurable pre-due, on-due, and overdue reminder cadences.', color: 'from-warning/20 to-success/10 text-warning' },
  { icon: Shield, label: 'Row-Level Security', desc: 'Postgres RLS ensures tenants never see each other\'s data.', color: 'from-danger/20 to-warning/10 text-danger' },
  { icon: Download, label: 'CSV / Excel Export', desc: 'Export invoices, clients, employees, and payroll to spreadsheets.', color: 'from-primary/20 to-muted/10 text-primary' },
  { icon: TrendingUp, label: 'Advanced Analytics', desc: 'AR aging, cashflow trends, payroll expense, client profitability.', color: 'from-accent/20 to-success/10 text-accent' },
  { icon: Globe, label: 'Multi-Company', desc: 'One login, multiple tenants. Switch companies instantly.', color: 'from-success/20 to-primary/10 text-success' },
];

function BonusSection() {
  return (
    <section className="py-28 lg:py-36 px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-warning mb-5">
            <Star className="h-3.5 w-3.5 fill-warning" />
            Bonus features — all included
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-5">
            The extras that make it exceptional
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Every plan ships with these power features — no upsells, no surprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BONUS.map(({ icon: Icon, label, desc, color }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-border bg-card p-5 hover:border-accent/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} mb-4`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-bold text-foreground mb-1.5">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  { step: '01', title: 'Register & set up your company', desc: 'Create your account, add company branding — logo, colors, and tax details. Takes under 2 minutes.', icon: Building2 },
  { step: '02', title: 'Design your invoice template', desc: 'Use the drag-and-drop designer to create a branded template. Choose themes, arrange blocks, preview in real-time.', icon: Palette },
  { step: '03', title: 'Invoice clients & run payroll', desc: 'Create invoices with AI assistance, send via email, track payments. Process monthly payroll and download salary slips as PDF.', icon: Zap },
];

function HowItWorksSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="py-28 lg:py-36 px-6 bg-surface/20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-20"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            <Zap className="h-3.5 w-3.5" />
            How it works
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-5">Up and running in minutes</h2>
          <p className="text-lg text-muted-foreground">Not days, not weeks. Just minutes.</p>
        </motion.div>

        <div ref={ref} className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-[3.25rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 bg-border/60 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 1, delay: 0.4, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-primary to-accent origin-left"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {STEPS.map(({ step, title, desc, icon: Icon }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.5, delay: i * 0.14 }}
                className="flex flex-col items-center text-center"
              >
                <div className="relative mb-7">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={inView ? { scale: 1 } : {}}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 + i * 0.14 }}
                    className="flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-3xl bg-gradient-primary shadow-xl shadow-primary/30"
                  >
                    <Icon className="h-9 w-9 text-white" />
                  </motion.div>
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background border-2 border-border text-[11px] font-extrabold text-primary shadow-sm">
                    {step}
                  </div>
                </div>
                <h3 className="font-bold text-foreground mb-3 text-lg leading-snug">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{desc}</p>
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
    monthlyPrice: 'Free',
    yearlyPrice: 'Free',
    period: '',
    desc: 'Perfect for freelancers and solo operators.',
    features: ['Up to 20 invoices/month', '5 clients', '3 employees', 'PDF generation', 'Email delivery'],
    cta: 'Start free',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'Business',
    monthlyPrice: '₨ 4,999',
    yearlyPrice: '₨ 3,999',
    period: '/month',
    desc: 'For growing teams that need the full suite.',
    features: ['Unlimited invoices', 'Unlimited clients & employees', 'WYSIWYG invoice designer', 'Payroll processing', 'AI invoice generation', 'QR code sharing', 'Excel/CSV exports', 'Audit logs'],
    cta: 'Get Business',
    href: '/auth/register',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    yearlyPrice: 'Custom',
    period: '',
    desc: 'Multiple companies, advanced analytics, SLA.',
    features: ['Everything in Business', 'Multi-company support', 'Custom branding', 'Dedicated support', 'SLA guarantee', 'On-premise option'],
    cta: 'Contact sales',
    href: '/auth/register',
    highlighted: false,
  },
];

function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-28 lg:py-36 px-6">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
            <CreditCard className="h-3.5 w-3.5" />
            Pricing
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-5">Simple, transparent pricing</h2>
          <p className="text-lg text-muted-foreground mb-8">No hidden fees. Cancel anytime.</p>

          {/* Toggle */}
          <div className="inline-flex items-center gap-3 rounded-xl border border-border bg-card p-1.5">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${!annual ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${annual ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Annual
              <span className="rounded-full bg-success/90 px-1.5 py-0.5 text-[10px] font-bold text-white">−20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {PLANS.map(({ name, monthlyPrice, yearlyPrice, period, desc, features, cta, href, highlighted }, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.45, delay: i * 0.1 }}
              whileHover={{ y: highlighted ? -2 : -4 }}
              className={[
                'relative rounded-2xl p-8 transition-all duration-200',
                highlighted
                  ? 'bg-card border-2 border-primary/50 shadow-2xl shadow-primary/15 scale-[1.03]'
                  : 'bg-card border border-border hover:border-accent/40 hover:shadow-lg hover:shadow-primary/5',
              ].join(' ')}
            >
              {highlighted && (
                <>
                  {/* Gradient glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-5 bg-gradient-primary pointer-events-none" />
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                    <span className="bg-gradient-to-r from-primary to-accent text-white text-xs font-bold px-5 py-1.5 rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                </>
              )}

              <div className="mb-7">
                <h3 className="text-lg font-bold text-foreground mb-1">{name}</h3>
                <p className="text-sm text-muted-foreground mb-5">{desc}</p>
                <div className="flex items-baseline gap-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={annual ? 'y' : 'm'}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="text-4xl font-extrabold text-foreground tracking-tight tabular-nums"
                    >
                      {annual ? yearlyPrice : monthlyPrice}
                    </motion.span>
                  </AnimatePresence>
                  {period && <span className="text-sm text-muted-foreground">{period}</span>}
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={href}
                className={[
                  'block w-full rounded-xl py-3.5 text-center text-sm font-bold transition-all',
                  highlighted
                    ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px'
                    : 'border border-border bg-background text-foreground hover:bg-surface hover:border-accent/40',
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

// ─── CTA Banner ───────────────────────────────────────────────────────────────

function CtaBanner() {
  return (
    <section className="py-28 lg:py-36 px-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl relative"
      >
        {/* Outer glow */}
        <div className="absolute -inset-1 rounded-[2rem] bg-gradient-to-r from-primary to-accent opacity-30 blur-xl" />

        <div className="relative rounded-3xl overflow-hidden border border-primary/20">
          {/* BG layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#2d3f80] to-accent" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute top-0 right-0 h-72 w-72 rounded-full blur-3xl bg-white/10" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full blur-3xl bg-black/15" />

          <div className="relative px-8 py-20 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white/80 mb-7"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ready to get started?
            </motion.div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-5 tracking-tight">
              Ditch the spreadsheets.<br />
              <span className="text-white/70">Ship faster with Sterling.</span>
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
              Join businesses using Sterling to create professional invoices, process payroll, and stay on top of their finances — all in one beautiful dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-extrabold text-primary shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all"
              >
                Create free account
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 backdrop-blur px-8 py-4 text-sm font-semibold text-white hover:bg-white/20 transition-all"
              >
                Sign in to your account
              </Link>
            </div>
            <p className="mt-6 text-xs text-white/40">No credit card required · Free plan available forever</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const FOOTER_LINKS = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'AI Assistant', href: '/auth/register' },
    { label: 'Invoice Designer', href: '/auth/register' },
    { label: 'Payroll', href: '/auth/register' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
    { label: 'Status', href: '#' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'Security', href: '#' },
  ],
};

function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand col — spans 2 */}
          <div className="lg:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-md">
                <DollarSign className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-foreground">Sterling</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Invoice & Payroll, refined. A premium multi-tenant SaaS platform built for modern SMBs who care about their brand.
            </p>
            <p className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-warning" />
              Built for DotCode Hackathon 2025
            </p>
            {/* Socials */}
            <div className="flex items-center gap-3 pt-1">
              {[
                { icon: Github, label: 'GitHub', href: '#' },
                { icon: Twitter, label: 'X / Twitter', href: '#' },
                { icon: Linkedin, label: 'LinkedIn', href: '#' },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-surface transition-all"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link cols */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-foreground mb-5">{title}</h4>
              <ul className="space-y-3">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <a
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Sterling. All rights reserved.</span>
            <span className="hidden sm:inline text-border">·</span>
            <span>Made with ♥ for DotCode Hackathon</span>
          </div>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/40 hover:bg-surface transition-all"
            aria-label="Back to top"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Back to top
          </button>
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
      <TrustBar />
      <FeaturesSection />
      <BonusSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <PricingSection />
      <CtaBanner />
      <Footer />
      <GuestSupportChat />
    </div>
  );
}
