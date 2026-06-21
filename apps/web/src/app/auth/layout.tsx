import { GuestSupportChat } from '@/components/support/guest-support-chat';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(var(--accent)/0.1)_0%,_transparent_60%)]" />

      <div className="relative z-10 w-full max-w-md px-4">{children}</div>

      <GuestSupportChat />
    </div>
  );
}
