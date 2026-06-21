import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';
import { MarketingNav } from './_marketing/marketing-nav';
import { HeroCanvasLoader } from './_marketing/hero-canvas-loader';
import { FeaturesSection } from './_marketing/features-section';
import { PricingSection } from './_marketing/pricing-section';
import { TestimonialsSection } from './_marketing/testimonials-section';
import { FooterSection } from './_marketing/footer-section';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Sterling — Smart Invoice & Payroll Platform',
  description:
    'Sterling is a premium multi-tenant SaaS for SMBs to design branded invoices, manage payroll, and monitor financial performance from one dashboard.',
  keywords: ['invoice', 'payroll', 'billing', 'salary slip', 'accounting', 'SMB', 'finance'],
  authors: [{ name: 'Sterling' }],
  openGraph: {
    type: 'website',
    title: 'Sterling — Smart Invoice & Payroll Platform',
    description:
      'Invoice & Payroll, refined. One platform to invoice clients, run payroll, and understand your finances.',
    siteName: 'Sterling',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Sterling Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sterling — Smart Invoice & Payroll Platform',
    description: 'Invoice & Payroll, refined.',
    images: ['/og-image.png'],
  },
  robots: { index: true, follow: true },
};

export default function LandingPage() {
  return (
    <>
      <MarketingNav />
      <main>
        {/* Hero */}
        <section
          className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-surface to-background"
          aria-label="Hero"
        >
          {/* 3D canvas background (client-only, ssr:false via loader) */}
          <HeroCanvasLoader />

          {/* Radial gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, hsl(var(--background) / 0.7) 100%)',
            }}
            aria-hidden="true"
          />

          {/* Content */}
          <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center pt-24 pb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold text-primary mb-8 shadow-sm">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Invoice & Payroll, refined.
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-foreground tracking-tight leading-[1.1] mb-6">
              One platform to{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              >
                invoice & pay
              </span>{' '}
              your whole team
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Design branded invoices, run payroll in minutes, generate salary slips, and monitor
              your financial health — all in one premium, multi-tenant platform built for growing
              businesses.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/register">
                <Button size="xl" className="group shadow-lg shadow-primary/20">
                  Start for free
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="xl">
                  Sign in
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              14-day free trial · No credit card required · Cancel anytime
            </p>
          </div>

          {/* Scroll indicator */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-50"
            aria-hidden="true"
          >
            <div className="h-10 w-6 rounded-full border-2 border-muted flex items-start justify-center pt-1.5">
              <div className="h-1.5 w-1 rounded-full bg-muted animate-bounce" />
            </div>
          </div>
        </section>

        {/* Sections */}
        <FeaturesSection />
        <PricingSection />
        <TestimonialsSection />
      </main>

      <FooterSection />
    </>
  );
}
