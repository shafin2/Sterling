'use client';

import { Bell, ChevronDown, Search, Moon, Sun, LogOut, User, Menu, CheckCircle, AlertTriangle, Clock, ArrowRight, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { CommandPalette } from './command-palette';
import { useMe, useLogout } from '@/hooks/use-me';
import { invoicesApi } from '@/lib/api/invoices';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface TopbarProps {
  onMenuClick?: () => void;
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency, maximumFractionDigits: 0 })
    .format(amount / 100);
}

function relativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: me } = useMe();
  const logout = useLogout();

  // Fetch overdue invoices for notification count
  const { data: overdueData } = useQuery({
    queryKey: ['invoices', 'overdue-notif'],
    queryFn: () => invoicesApi.list({ status: 'overdue', page: 1, limit: 10 }),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // Fetch recent invoices (last 30 days activity) when panel is open
  const { data: recentData } = useQuery({
    queryKey: ['invoices', 'recent-notif'],
    queryFn: () => invoicesApi.list({ page: 1, limit: 8 }),
    staleTime: 60_000,
    enabled: notifOpen,
  });

  useEffect(() => setMounted(true), []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const ThemeIcon = !mounted ? Sun : resolvedTheme === 'dark' ? Moon : Sun;

  const initials = me
    ? `${me.firstName[0] ?? ''}${me.lastName[0] ?? ''}`.toUpperCase()
    : '…';

  const displayName = me ? `${me.firstName} ${me.lastName}` : '…';

  const overdueInvoices = overdueData?.data ?? [];
  const overdueCount = overdueInvoices.length;
  const recentInvoices = recentData?.data ?? [];

  // Build notification list: overdue first, then recent non-draft
  const notifItems = [
    ...overdueInvoices.map((inv) => ({ ...inv, _kind: 'overdue' as const })),
    ...recentInvoices
      .filter((inv) => inv.status !== 'draft' && !overdueInvoices.some((o) => o.id === inv.id))
      .slice(0, 5)
      .map((inv) => ({ ...inv, _kind: 'recent' as const })),
  ];

  return (
    <>
      <header className="glass flex h-16 shrink-0 items-center gap-3 border-b border-border/60 px-4 sm:px-6">
        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg lg:hidden',
              'text-muted-foreground hover:bg-surface hover:text-foreground',
              'transition-colors focus-ring shrink-0',
            )}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Command palette trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className={cn(
            'flex h-9 flex-1 max-w-xs items-center gap-2 rounded-lg border border-border',
            'bg-surface/50 px-3 text-sm text-muted-foreground',
            'hover:bg-surface hover:text-foreground transition-colors',
            'focus-ring cursor-pointer',
          )}
          aria-label="Open command palette (⌘K)"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left hidden sm:block">Search or jump to…</span>
          <span className="flex-1 text-left sm:hidden">Search…</span>
          <kbd className="hidden rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] font-mono sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg',
              'text-muted-foreground hover:bg-surface hover:text-foreground',
              'transition-colors focus-ring',
            )}
            aria-label="Toggle theme"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className={cn(
                'relative flex h-9 w-9 items-center justify-center rounded-lg',
                'text-muted-foreground hover:bg-surface hover:text-foreground',
                'transition-colors focus-ring',
                notifOpen && 'bg-surface text-foreground',
              )}
              aria-label="Notifications"
              aria-expanded={notifOpen}
              aria-haspopup="true"
            >
              <Bell className="h-4 w-4" />
              {overdueCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'absolute right-0 top-full mt-1 z-50',
                    'w-80 sm:w-96 rounded-xl border border-border',
                    'bg-background/95 backdrop-blur-xl shadow-lg',
                    'overflow-hidden',
                  )}
                  role="dialog"
                  aria-label="Notifications panel"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">Notifications</span>
                      {overdueCount > 0 && (
                        <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                          {overdueCount}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Items */}
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifItems.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                          <CheckCircle className="h-5 w-5 text-success" />
                        </div>
                        <p className="text-sm font-medium text-foreground">You're all caught up!</p>
                        <p className="text-xs text-muted-foreground">No overdue invoices or pending actions.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {notifItems.map((item) => (
                          <Link
                            key={item.id}
                            href={`/app/invoices/${item.id}`}
                            onClick={() => setNotifOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-surface/60 transition-colors"
                          >
                            <div className={cn(
                              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                              item._kind === 'overdue' ? 'bg-danger/10' :
                              item.status === 'paid' ? 'bg-success/10' : 'bg-warning/10',
                            )}>
                              {item._kind === 'overdue' ? (
                                <AlertTriangle className="h-3.5 w-3.5 text-danger" />
                              ) : item.status === 'paid' ? (
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-warning" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {item.number}
                                  {item.client?.name && (
                                    <span className="text-muted-foreground font-normal"> · {item.client.name}</span>
                                  )}
                                </p>
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {relativeDate(item._kind === 'overdue' ? item.dueDate : item.updatedAt)}
                                </span>
                              </div>
                              <p className={cn(
                                'text-xs mt-0.5',
                                item._kind === 'overdue' ? 'text-danger' :
                                item.status === 'paid' ? 'text-success' : 'text-warning',
                              )}>
                                {item._kind === 'overdue'
                                  ? `Overdue — due ${new Date(item.dueDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}`
                                  : item.status === 'paid'
                                  ? 'Payment received'
                                  : `Sent · awaiting payment`
                                }
                              </p>
                              <p className="text-xs text-muted-foreground tabular-nums">
                                {formatCurrency(item.total, item.currency)}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifItems.length > 0 && (
                    <div className="border-t border-border px-4 py-2">
                      <Link
                        href="/app/invoices"
                        onClick={() => setNotifOpen(false)}
                        className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-accent transition-colors py-1"
                      >
                        View all invoices <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5',
                'text-sm font-medium hover:bg-surface',
                'transition-colors focus-ring',
              )}
              aria-label="Profile menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden text-foreground sm:block">{displayName}</span>
              <ChevronDown
                className={cn(
                  'hidden h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 sm:block',
                  profileOpen && 'rotate-180',
                )}
              />
            </button>

            {profileOpen && (
              <div
                role="menu"
                className={cn(
                  'absolute right-0 top-full mt-1 w-52 rounded-xl border border-border',
                  'bg-background/95 backdrop-blur-xl shadow-lg py-1 z-50',
                )}
              >
                {/* User info header */}
                <div className="border-b border-border px-3 py-2">
                  <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{me?.email}</p>
                  {me?.role && (
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium capitalize text-primary">
                      {me.role}
                    </span>
                  )}
                </div>

                <button
                  role="menuitem"
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground',
                    'hover:bg-surface transition-colors',
                  )}
                  onClick={() => { setProfileOpen(false); window.location.href = '/app/settings'; }}
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  Profile & Settings
                </button>

                <button
                  role="menuitem"
                  disabled={logout.isPending}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm',
                    'text-danger hover:bg-danger/10 transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                  onClick={() => logout.mutate()}
                >
                  <LogOut className="h-4 w-4" />
                  {logout.isPending ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </>
  );
}
