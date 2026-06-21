'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  BarChart3,
  Settings,
  Building2,
  Palette,
  FolderOpen,
  Shield,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/use-me';

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavIcon = React.ComponentType<{ className?: string }>;

const NAV: Array<
  | { type: 'link'; href: string; label: string; icon: NavIcon; exact?: boolean }
  | {
      type: 'group';
      label: string;
      icon: NavIcon;
      children: { href: string; label: string; icon: NavIcon }[];
    }
> = [
  { type: 'link', href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  {
    type: 'group',
    label: 'Finance',
    icon: DollarSign,
    children: [
      { href: '/app/invoices', label: 'Invoices', icon: FileText },
      { href: '/app/designer', label: 'Templates & Designer', icon: Palette },
      { href: '/app/clients', label: 'Clients', icon: Building2 },
    ],
  },
  {
    type: 'group',
    label: 'People',
    icon: Users,
    children: [
      { href: '/app/employees', label: 'Employees', icon: Users },
      { href: '/app/employees/departments', label: 'Departments', icon: FolderOpen },
      { href: '/app/payroll', label: 'Payroll', icon: Briefcase },
    ],
  },
  {
    type: 'group',
    label: 'Insights',
    icon: BarChart3,
    children: [
      { href: '/app/reports', label: 'Reports', icon: BarChart3 },
      { href: '/app/ai', label: 'AI Assistant', icon: Sparkles },
    ],
  },
];

const BOTTOM_ITEMS: { href: string; label: string; icon: NavIcon }[] = [
  { href: '/app/audit-logs', label: 'Audit Logs', icon: Shield },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

// ─── Tooltip wrapper (shown in icon-only mode) ────────────────────────────────

function NavTooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>;
  return (
    <div className="group/tip relative">
      {children}
      <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded-md border border-white/10 bg-[#1e2a4a] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}

// ─── Sidebar component ────────────────────────────────────────────────────────

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: me } = useMe();

  // Collapse state (icon-only) — persisted
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('sterling-sidebar-collapsed');
    if (stored === 'true') setCollapsed(true);
  }, []);
  const toggleCollapse = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem('sterling-sidebar-collapsed', String(!c));
      return !c;
    });
  }, []);

  // Group open state — auto-open if child is active
  const initialOpen: Record<string, boolean> = {};
  NAV.forEach((item) => {
    if (item.type === 'group') {
      initialOpen[item.label] = item.children.some((c) => pathname.startsWith(c.href));
    }
  });
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const tenantName = me?.tenant?.name ?? 'Sterling';
  const tenantInitials = tenantName.slice(0, 2).toUpperCase();

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'glass-sidebar shrink-0 flex-col overflow-hidden',
        'lg:relative lg:flex',
        isOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden',
      )}
      style={{ minWidth: collapsed ? 64 : 256 }}
      aria-label="Main navigation"
    >
      {/* ── Tenant header ── */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
          {me?.tenant?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.tenant.logo} alt={tenantName} className="h-full w-full rounded-lg object-cover" />
          ) : (
            <span className="text-xs font-bold text-white">{tenantInitials}</span>
          )}
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="tenant-text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="min-w-0 flex-1 overflow-hidden"
            >
              <p className="truncate text-sm font-semibold leading-tight text-white">{tenantName}</p>
              {me?.role && (
                <p className="truncate text-[10px] capitalize text-white/50">{me.role}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile close / Desktop collapse toggle */}
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={toggleCollapse}
          className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/10 hover:text-white lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
        {NAV.map((item) => {
          if (item.type === 'link') {
            const active = isActive(item.href, item.exact);
            return (
              <NavTooltip key={item.href} label={item.label} collapsed={collapsed}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-150',
                    'hover:bg-sidebar-hover focus-ring',
                    active ? 'text-white' : 'text-sidebar-foreground hover:text-white',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-lg bg-sidebar-active/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <item.icon className={cn('relative z-10 h-4 w-4 shrink-0 transition-colors', active ? 'text-accent' : 'text-sidebar-foreground group-hover:text-white')} />
                  <AnimatePresence initial={false}>
                    {!collapsed && (
                      <motion.span
                        key="label"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.12 }}
                        className="relative z-10 truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {active && !collapsed && (
                    <div className="relative z-10 ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  )}
                </Link>
              </NavTooltip>
            );
          }

          // Group
          const groupActive = item.children.some((c) => pathname.startsWith(c.href));
          const isOpen2 = openGroups[item.label] ?? false;

          if (collapsed) {
            // In icon-only mode: show each child as an icon link with tooltip
            return item.children.map((child) => {
              const active = pathname.startsWith(child.href);
              return (
                <NavTooltip key={child.href} label={child.label} collapsed>
                  <Link
                    href={child.href}
                    onClick={onClose}
                    className={cn(
                      'group relative flex items-center justify-center overflow-hidden rounded-lg py-2.5 text-sm font-medium transition-all duration-150',
                      'hover:bg-sidebar-hover focus-ring',
                      active ? 'text-white' : 'text-sidebar-foreground hover:text-white',
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-sidebar-active/20"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <child.icon className={cn('relative z-10 h-4 w-4 shrink-0', active ? 'text-accent' : 'text-sidebar-foreground group-hover:text-white')} />
                  </Link>
                </NavTooltip>
              );
            });
          }

          return (
            <div key={item.label}>
              {/* Group header */}
              <button
                onClick={() => toggleGroup(item.label)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                  'hover:bg-sidebar-hover',
                  groupActive ? 'text-accent/80' : 'text-white/35 hover:text-white/60',
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <motion.div animate={{ rotate: isOpen2 ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
              </button>

              {/* Group children */}
              <AnimatePresence initial={false}>
                {isOpen2 && (
                  <motion.div
                    key="children"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="mt-0.5 space-y-0.5 pl-3">
                      {item.children.map((child) => {
                        const active = pathname.startsWith(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={onClose}
                            className={cn(
                              'group relative flex items-center gap-2.5 overflow-hidden rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                              'hover:bg-sidebar-hover focus-ring',
                              active ? 'text-white' : 'text-sidebar-foreground hover:text-white',
                            )}
                          >
                            {active && (
                              <motion.div
                                layoutId="sidebar-active"
                                className="absolute inset-0 rounded-lg bg-sidebar-active/20"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                              />
                            )}
                            {/* Indent line */}
                            <div
                              className={cn(
                                'relative z-10 h-4 w-px shrink-0 rounded-full',
                                active ? 'bg-accent' : 'bg-white/15 group-hover:bg-white/30',
                              )}
                            />
                            <child.icon
                              className={cn(
                                'relative z-10 h-3.5 w-3.5 shrink-0 transition-colors',
                                active ? 'text-accent' : 'text-sidebar-foreground group-hover:text-white',
                              )}
                            />
                            <span className="relative z-10 truncate text-[13px]">{child.label}</span>
                            {active && (
                              <div className="relative z-10 ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* ── Bottom items ── */}
      <div className="shrink-0 border-t border-white/10 px-2 py-2 space-y-0.5">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          const BotIcon = item.icon;
          return (
            <NavTooltip key={item.href} label={item.label} collapsed={collapsed}>
              <Link
                href={item.href}
                onClick={onClose}
                className={cn(
                  'group relative flex items-center gap-3 overflow-hidden rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all duration-150',
                  'hover:bg-sidebar-hover focus-ring',
                  active ? 'text-white' : 'text-sidebar-foreground hover:text-white',
                  collapsed ? 'justify-center px-0' : '',
                )}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg bg-sidebar-active/20"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <BotIcon className={cn('relative z-10 h-4 w-4 shrink-0 transition-colors', active ? 'text-accent' : 'text-sidebar-foreground group-hover:text-white')} />
                <AnimatePresence initial={false}>
                  {!collapsed && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.12 }}
                      className="relative z-10 truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            </NavTooltip>
          );
        })}
      </div>
    </motion.aside>
  );
}
