import { ShellLayout } from '@/components/shell/shell-layout';
import { SupportChat } from '@/components/support/support-chat';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShellLayout>
      {children}
      <SupportChat />
    </ShellLayout>
  );
}
