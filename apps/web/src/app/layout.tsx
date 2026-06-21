import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const APP_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://sterling.app';
const title = 'Sterling — Smart Invoice & Payroll';
const description =
  'Sterling is a premium multi-tenant SaaS for SMBs to design branded invoices, manage clients & employees, run payroll, generate salary slips, track payments, and monitor financial performance from one dashboard.';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: title, template: '%s | Sterling' },
  description,
  keywords: ['invoice', 'payroll', 'billing', 'salary slip', 'accounting', 'SMB'],
  authors: [{ name: 'Sterling' }],
  openGraph: {
    type: 'website',
    title,
    description,
    siteName: 'Sterling',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
  icons: { icon: '/favicon.ico', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
