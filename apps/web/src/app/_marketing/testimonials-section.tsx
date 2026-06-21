'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    quote:
      "Sterling replaced three separate tools we were using for invoicing, payroll, and reporting. The WYSIWYG designer is genuinely magical — our invoices look exactly like we designed them.",
    name: 'Aisha Mensah',
    role: 'CEO, Volta Consulting',
    initials: 'AM',
    rating: 5,
  },
  {
    quote:
      "Processing payroll used to take me half a day. With Sterling it's under 20 minutes — including generating and emailing every salary slip. The tax rules are flexible enough for our country-specific setup.",
    name: 'Rafael Sousa',
    role: 'Finance Director, Novatek Ltd',
    initials: 'RS',
    rating: 5,
  },
  {
    quote:
      "We manage payroll for 80 staff across four entities. The multi-tenant isolation and role-based access give us the security our auditors require. The audit log alone is worth the subscription.",
    name: 'Priya Nair',
    role: 'Head of HR, Meridian Group',
    initials: 'PN',
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
            Customer stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight mb-4">
            Trusted by finance teams worldwide
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            From freelancers to enterprise finance teams — Sterling adapts to how you work.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="rounded-2xl border border-border bg-card p-8 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-5" aria-label={`${testimonial.rating} out of 5 stars`}>
                {Array.from({ length: testimonial.rating }).map((_, idx) => (
                  <Star key={idx} className="h-4 w-4 fill-warning text-warning" aria-hidden="true" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-sm text-muted-foreground leading-relaxed mb-6">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                  {testimonial.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
