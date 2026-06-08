import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Card } from '@/components/ui';
import { BadgeIcon } from '@/features/gamification/BadgeIcon';
import { tr } from '@/i18n/tr';
import type { TaskReward } from '@/types/api';

interface CelebrationContextValue {
  /** Gorev tamamlama odulunu kutlama olarak gosterir. */
  celebrate: (reward: TaskReward) => void;
}

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

const CONFETTI_COLORS = ['#14b8a6', '#0ea5a4', '#f59e0b', '#34d399', '#22d3ee', '#fbbf24'];

/**
 * Gorev tamamlaninca kisa, zarif bir kutlama (puan + seri + yeni rozet) gosterir.
 * Emoji yok; ikon ve hafif konfeti animasyonu. Saglayici uygulama kabugunu sarar.
 */
export function CelebrationProvider({ children }: { children: ReactNode }) {
  const [reward, setReward] = useState<TaskReward | null>(null);
  const timer = useRef<number | null>(null);

  const celebrate = useCallback((r: TaskReward) => {
    setReward(r);
    if (timer.current) window.clearTimeout(timer.current);
    const ms = r.new_badges.length > 0 ? 3800 : 2200;
    timer.current = window.setTimeout(() => setReward(null), ms);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate }}>
      {children}
      {reward ? <CelebrationOverlay reward={reward} /> : null}
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): CelebrationContextValue {
  // Saglayici yoksa sessiz no-op.
  return useContext(CelebrationContext) ?? { celebrate: () => {} };
}

function CelebrationOverlay({ reward }: { reward: TaskReward }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-start justify-center overflow-hidden"
      aria-live="polite"
    >
      <style>{`
        @keyframes np-pop {
          0% { opacity: 0; transform: translateY(-14px) scale(.82); }
          55% { transform: translateY(0) scale(1.04); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes np-fall {
          0% { transform: translateY(-12vh) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(82vh) rotate(380deg); opacity: 0; }
        }
      `}</style>

      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            left: `${(i * 6 + 6) % 96}%`,
            width: 8,
            height: 13,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            borderRadius: 2,
            animation: `np-fall ${1500 + (i % 4) * 350}ms ${(i % 5) * 90}ms ease-in forwards`,
          }}
        />
      ))}

      <div className="mt-[17vh] w-full max-w-xs px-6" style={{ animation: 'np-pop 600ms ease-out' }}>
        <Card padding="md" className="text-center">
          <p className="text-[1.6rem] font-bold leading-none text-[var(--primary)]">
            {tr.game.celebratePoints(reward.points)}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">{tr.game.niceWork}</p>

          {reward.streak >= 2 ? (
            <p className="mt-1.5 text-sm font-semibold text-amber-500">
              {tr.game.celebrateStreak(reward.streak)}
            </p>
          ) : null}

          {reward.new_badges.length > 0 ? (
            <div className="mt-3 space-y-2">
              {reward.new_badges.map((b) => (
                <div
                  key={b.code}
                  className="flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-left"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-contrast)]">
                    <BadgeIcon name={b.icon} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-[var(--muted)]">{tr.game.newBadge}</span>
                    <span className="block truncate text-sm font-semibold text-[var(--text)]">
                      {b.name}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
