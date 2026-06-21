'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  DollarSign,
  BarChart3,
  Settings,
  Building2,
  Palette,
  FolderOpen,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMe } from '@/hooks/use-me';

const NAV_ITEMS = [
  { href: '/app', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/app/invoices', label: 'Invoices', icon: FileText },
  { href: '/app/designer', label: 'Designer', icon: Palette },
  { href: '/app/clients', label: 'Clients', icon: Building2 },
  { href: '/app/employees', label: 'Employees', icon: Users },
  { href: '/app/employees/departments', label: 'Departments', icon: FolderOpen },
  { href: '/app/payroll', label: 'Payroll', icon: Briefcase },
  { href: '/app/reports', label: 'Reports', icon: BarChart3 },
  { href: '/app/audit-logs', label: 'Audit Logs', icon: Shield },
];

const BOTTOM_ITEMS = [
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: me } = useMe();

  const tenantName = me?.tenant?.name ?? 'Sterling';
  const tenantInitials = tenantName.slice(0, 2).toUpperCase();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'glass-sidebar w-64 shrink-0 flex-col',
        // Desktop: always in-flow and visible
        'lg:relative lg:flex',
        // Mobile: hidden by default; shown as fixed overlay when open
        isOpen
          ? 'fixed inset-y-0 left-0 z-40 flex'
          : 'hidden',
      )}
      aria-label="Main navigation"
    >
      {/* Tenant identity */}
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
          {me?.tenant?.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={me.tenant.logo}
              alt={tenantName}
              className="h-full w-full rounded-lg object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-white">{tenantInitials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight text-white">{tenantName}</p>
          {me?.role && (
            <p className="truncate text-[10px] capitalize text-white/50">{me.role}</p>
          )}
        </div>
        {/* Close on mobile / branding icon on desktop */}
        <button
          onClick={onClose}
          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
        <DollarSign className="ml-auto hidden h-4 w-4 shrink-0 text-white/30 lg:block" />
      </div>

      {/* Main nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'group relative flex items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                'hover:bg-sidebar-hover focus-ring',
                active
                  ? 'bg-sidebar-active/20 text-white'
                  : 'text-sidebar-foreground hover:text-white',
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-active/20"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <item.icon
                className={cn(
                  'relative z-10 h-4 w-4 shrink-0 transition-colors',
                  active ? 'text-accent' : 'text-sidebar-foreground group-hover:text-white',
                )}
              />
              <span className="relative z-10 truncate">{item.label}</span>
              {active && (
                <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="border-t border-white/10 px-3 py-3">
        {BOTTOM_ITEMS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                'hover:bg-sidebar-hover focus-ring',
                active ? 'text-white' : 'text-sidebar-foreground hover:text-white',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
