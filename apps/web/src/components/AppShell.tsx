import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Icon } from '@nebula-clock/ui';
import type { Route } from '../hooks/useHashRoute.js';
import { useNebulaHub } from '../hooks/useNebulaHub.js';
import { getDesktop } from '../lib/platform.js';
import { Sidebar } from './Sidebar.js';
import { UpdateBanner } from './UpdateBanner.js';

export interface AppShellProps {
  route: Route;
  onNavigate: (route: Route) => void;
  children: ReactNode;
}

/**
 * The Nebula window shell (Nebula Hub `app.css`): the drag strip of the frameless desktop
 * window, the floating sidebar, and the centered content column. A plain landmark structure
 * (skip link, nav, main), so the whole app is navigable by keyboard and by landmarks.
 */
export function AppShell({ route, onNavigate, children }: AppShellProps) {
  const { t } = useTranslation(['common']);
  const desktop = getDesktop();
  const hub = useNebulaHub();
  const [hubNotice, setHubNotice] = useState(false);

  // "Nebula apps": opens Nebula Hub, or its download page when it is not installed.
  const openHub = desktop?.openHub
    ? () => void desktop.openHub?.().then((result) => setHubNotice(result === 'not-installed'))
    : undefined;

  return (
    <>
      {desktop ? <div className="titlebar-drag" aria-hidden="true" /> : null}

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-12 focus:z-[80] focus:rounded focus:bg-card focus:px-4 focus:py-2"
      >
        {t('common:a11y.skipToContent')}
      </a>

      <div className="app-shell">
        <Sidebar
          route={route}
          onNavigate={onNavigate}
          hub={desktop?.getHubState ? { state: hub.state, onOpenApps: openHub } : null}
        />

        <div className="workspace-column">
          <main id="main" className="workspace">
            <div className="workspace-inner">
              {desktop?.hubMode === 'docked' ? (
                <div className="hub-strip" role="status">
                  <span>
                    <Icon name="orbit" size={16} />
                    {t('common:nebula.docked')}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => void desktop.detachFromHub?.()}>
                    {t('common:nebula.detach')}
                  </Button>
                </div>
              ) : null}
              {hubNotice ? (
                <p className="state-banner" role="status">
                  <Icon name="info" size={18} />
                  <span>{t('common:nebula.notInstalled')}</span>
                </p>
              ) : null}
              <UpdateBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
