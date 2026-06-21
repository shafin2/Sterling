'use client';

import * as React from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { VerifyEmailBanner } from './verify-email-banner';

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const closeSidebar = React.useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = React.useCallback(() => setSidebarOpen((o) => !o), []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay — clicks outside close the sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={toggleSidebar} />
        <VerifyEmailBanner />
        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
