import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarCheck, House, ListTodo, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { tr } from '@/i18n/tr';
import { cn } from '@/lib/cn';
import { GroupSwitcher } from './GroupSwitcher';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: '/', label: tr.nav.bugun, icon: House },
  { to: '/gorevler', label: tr.nav.gorevler, icon: ListTodo },
  { to: '/alisveris', label: tr.nav.alisveris, icon: ShoppingCart },
  { to: '/daha', label: tr.nav.daha, icon: CalendarCheck },
];

/**
 * Mobil oncelikli uygulama kabugu: sabit ust bar (grup degistirici) ve
 * alt navigasyon. Govde guvenli alanlara saygi duyacak sekilde kaydirilir.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg)]">
      {/* Ust bar */}
      <header
        className={cn(
          'sticky top-0 z-30 border-b border-[var(--border)]',
          'bg-[var(--bg)]/85 backdrop-blur-md pt-safe',
        )}
      >
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center px-3">
          <GroupSwitcher />
        </div>
      </header>

      {/* Icerik */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-28 pt-3">{children}</main>

      {/* Alt navigasyon */}
      <nav
        aria-label={tr.common.appName}
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)]',
          'bg-[var(--bg)]/90 backdrop-blur-md pb-safe',
        )}
      >
        <ul className="mx-auto flex w-full max-w-2xl items-stretch justify-around px-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 text-xs font-medium',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                    isActive
                      ? 'text-[var(--primary)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-6 w-6"
                      strokeWidth={isActive ? 2.4 : 1.9}
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
