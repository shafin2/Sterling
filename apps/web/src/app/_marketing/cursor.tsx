'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/**
 * Premium custom cursor for the marketing page only.
 * A precise dot tracks the pointer exactly; a soft metallic ring lags behind
 * with a spring and grows when hovering interactive elements.
 * Renders only on fine-pointer devices and hides the native arrow while active.
 */
export function MarketingCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);

  const dotX = useMotionValue(-100);
  const dotY = useMotionValue(-100);
  const ringX = useSpring(dotX, { stiffness: 380, damping: 30, mass: 0.4 });
  const ringY = useSpring(dotY, { stiffness: 380, damping: 30, mass: 0.4 });

  useEffect(() => {
    // Only on devices with a precise pointer + hover (skip touch / reduced-motion)
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    setEnabled(true);
    document.documentElement.classList.add('cursor-none');

    const move = (e: PointerEvent) => {
      dotX.set(e.clientX);
      dotY.set(e.clientY);
      const target = e.target as HTMLElement | null;
      setHovering(!!target?.closest('a, button, [role="button"], input, select, textarea, label'));
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);

    return () => {
      document.documentElement.classList.remove('cursor-none');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dotX, dotY]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] hidden md:block" aria-hidden="true">
      {/* Lagging ring */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="absolute left-0 top-0"
      >
        <motion.div
          animate={{
            width: hovering ? 56 : 34,
            height: hovering ? 56 : 34,
            opacity: hovering ? 0.9 : 0.55,
            scale: down ? 0.85 : 1,
          }}
          transition={{ type: 'spring', stiffness: 320, damping: 22 }}
          className="-translate-x-1/2 -translate-y-1/2 rounded-full border border-[#7091E6]/70"
          style={{
            boxShadow: '0 0 18px 0 rgba(112,145,230,0.35)',
            background:
              'radial-gradient(circle, rgba(112,145,230,0.10) 0%, transparent 70%)',
          }}
        />
      </motion.div>

      {/* Precise dot */}
      <motion.div
        style={{ x: dotX, y: dotY }}
        className="absolute left-0 top-0"
      >
        <motion.div
          animate={{ scale: hovering ? 0 : down ? 0.6 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className="-translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-gradient-to-br from-[#3D52A0] to-[#7091E6]"
        />
      </motion.div>
    </div>
  );
}
