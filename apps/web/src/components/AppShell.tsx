import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BarChart3, CalendarDays, ListTodo, Moon, Settings, Sun, Timer } from 'lucide-react';
import { GlowBackground, IconButton, Logo, cn } from '@nebula-clock/ui';
import type { Route } from '../hooks/useHashRoute.js';
import { ROUTES } from '../hooks/useHashRoute.js';
import { getDesktop } from '../lib/platform.js';
import { useSettingsStore } from '../store/settingsStore.js';
import { UpdateBanner } from './UpdateBanner.js';

const ICONS: Record<Route, typeof Timer> = {
  timer: Timer,
  tasks: ListTodo,
  stats: BarChart3,
  calendar: CalendarDays,
  settings: Settings,
};

export interface AppShellProps {
  route: Route;
  onNavigate: (route: Route) => void;
  children: ReactNode;
}

/**
 * Sidebar on desktop, bottom tab bar on phones. The Nebula glow sits behind
 * everything; the shell itself is a plain landmark structure so the whole app
 * is navigable by keyboard and by screen-reader landmarks.
 */
export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const { t } = useTranslation(['common']);
  const theme = useSettingsStore((state) => state.settings.appearance.theme);
  const updateAppearance = useSettingsStore((state) => state.updateAppearance);
  const [resolvedDark, setResolvedDark] = useState(true);

  // The icon must show the *effective* theme, which "system" alone cannot say.
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const compute = () => setResolvedDark(theme === 'system' ? !media.matches : theme === 'dark');
    compute();
    media.addEventListener('change', compute);
    return () => media.removeEventListener('change', compute);
  }, [theme]);

  const desktop = getDesktop();

  return (
    <div className="relative min-h-screen">
      <GlowBackground />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-card focus:px-4 focus:py-2"
      >
        {t('common:a11y.skipToContent')}
      </a>

      <div className="relative z-10 flex min-h-screen flex-col md:flex-row">
        <header
          className={cn(
            'flex shrink-0 items-center justify-between gap-3 border-border bg-surface/70 backdrop-blur',
            'border-b px-4 py-3',
            'md:h-screen md:w-56 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6',
            // In the frameless Electron window the header doubles as the drag bar.
            desktop && 'app-drag',
          )}
        >
          <Logo withWordmark size={28} className="app-no-drag md:mb-7 md:px-2" />

          <nav
            aria-label={t('common:nav.label')}
            className="app-no-drag hidden gap-1 md:flex md:flex-col"
          >
            {ROUTES.map((item) => {
              const Icon = ICONS[item];
              const active = item === route;
              return (
                <button
                  key={item}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onNavigate(item)}
                  className={cn(
                    'relative flex items-center gap-2.5 rounded px-3 py-2 text-left text-sm font-medium',
                    'transition-colors duration-fast ease-nebula',
                    active ? 'text-text' : 'text-text-secondary hover:bg-card-alt hover:text-text',
                  )}
                >
                  {/* One shared element slides between items instead of each
                      one fading its own background in and out. */}
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      aria-hidden="true"
                      transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                      className="absolute inset-0 -z-10 rounded bg-card-alt shadow-ring-soft"
                    />
                  ) : null}
                  <Icon size={16} aria-hidden="true" />
                  {t(`common:nav.${item}`)}
                </button>
              );
            })}
          </nav>

          <div className="app-no-drag flex items-center gap-1 md:mt-auto md:justify-between">
            <IconButton
              label={t('common:a11y.themeToggle')}
              icon={resolvedDark ? <Sun size={16} /> : <Moon size={16} />}
              onClick={() => updateAppearance({ theme: resolvedDark ? 'light' : 'dark' })}
            />
          </div>
        </header>

        <main
          id="main"
          className="nebula-scrollbar flex-1 overflow-y-auto p-4 pb-24 sm:p-6 md:pb-6"
        >
          <UpdateBanner />
          {children}
        </main>

        {/* Mobile tab bar. */}
        <nav
          aria-label={t('common:nav.label')}
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 backdrop-blur md:hidden"
        >
          {ROUTES.map((item) => {
            const Icon = ICONS[item];
            const active = item === route;
            return (
              <button
                key={item}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item)}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors duration-fast',
                  active ? 'text-accent' : 'text-text-secondary',
                )}
              >
                {/* Its own layoutId: the two navigation bars never share the
                    screen, and one shared id across both would animate
                    between elements that are display:none to each other. */}
                {active ? (
                  <motion.span
                    layoutId="nav-active-mobile"
                    aria-hidden="true"
                    transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                    className="absolute inset-x-5 top-0 h-0.5 rounded-pill bg-nebula-gradient"
                  />
                ) : null}
                <Icon size={18} aria-hidden="true" />
                {t(`common:nav.${item}`)}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
