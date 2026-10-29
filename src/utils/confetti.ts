import confetti from 'canvas-confetti';

/**
 * Triggers a lightweight celebratory confetti burst for major milestones
 * (e.g., League Champion, Cup Winner, important match victory).
 * Uses minimal particles and rapid decay to guarantee 60fps on mobile.
 */
export function fireLightweightCelebration(type: 'championship' | 'cup_win' = 'cup_win') {
  try {
    if (typeof window === 'undefined') return;

    if (type === 'championship') {
      // Golden champion burst (optimized for low mobile CPU/GPU usage)
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#10b981', '#38bdf8'],
        disableForReducedMotion: true,
        ticks: 120,
        gravity: 1.1,
        scalar: 0.9,
      });

      // Quick side accents after 200ms
      setTimeout(() => {
        confetti({
          particleCount: 25,
          angle: 60,
          spread: 45,
          origin: { x: 0.1, y: 0.7 },
          colors: ['#fbbf24', '#10b981', '#ffffff'],
          disableForReducedMotion: true,
          ticks: 90,
        });
        confetti({
          particleCount: 25,
          angle: 120,
          spread: 45,
          origin: { x: 0.9, y: 0.7 },
          colors: ['#fbbf24', '#38bdf8', '#ffffff'],
          disableForReducedMotion: true,
          ticks: 90,
        });
      }, 200);
    } else {
      // Snappy, lightweight single burst for cup / key victory
      confetti({
        particleCount: 35,
        spread: 50,
        origin: { y: 0.68 },
        colors: ['#10b981', '#06b6d4', '#eab308'],
        disableForReducedMotion: true,
        ticks: 90,
        gravity: 1.2,
        scalar: 0.85,
      });
    }
  } catch (e) {
    // Graceful fallback if canvas is unsupported
    console.debug('[Confetti] Skipped:', e);
  }
}
