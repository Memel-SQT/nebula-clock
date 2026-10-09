import { useTranslation } from 'react-i18next';
import { Icon, Logo, type IconName } from '@nebula-clock/ui';
import type { Route } from '../hooks/useHashRoute.js';
import type { HubState } from '../lib/platform.js';

const APP_VERSION = __APP_VERSION__;

interface Section {
  route: Route;
  icon: IconName;
}

const GROUPS: { id: 'focus' | 'progress'; sections: Section[] }[] = [
  {
    id: 'focus',
    sections: [
      { route: 'timer', icon: 'timer' },
      { route: 'tasks', icon: 'tasks' },
      // Nebula News' personal growth articles (Nebula Hub ADR-036): offered while Nebula Hub is there.
      { route: 'news', icon: 'newspaper' },
    ],
  },
  {
    id: 'progress',
    sections: [
      { route: 'stats', icon: 'chart' },
      { route: 'calendar', icon: 'calendar' },
    ],
  },
];

export interface SidebarProps {
  route: Route;
  onNavigate: (route: Route) => void;
  /** Desktop only: the Nebula Hub card and the "Nebula apps" entry. */
  hub: { state: HubState | null; onOpenApps?: () => void } | null;
}

/**
 * Sidebar, ported from Nebula Hub's `Sidebar.tsx` (05204fd): a floating panel with the brand
 * lockup, the sections in titled groups, then Settings, the Nebula Hub status card and the
 * local-only footer pinned at the bottom. Below 1100 px it becomes an icon rail (labels stay as
 * tooltips and for screen readers), below 720 px a bar at the top (sidebar.css).
 */
export function Sidebar({ route, onNavigate, hub }: SidebarProps) {
  const { t } = useTranslation(['common']);

  const navItem = ({ route: target, icon }: Section) => {
    const current = target === route;
    return (
      <button
        key={target}
        type="button"
        className={`nav-item ${current ? 'active' : ''}`}
        data-sound="nav"
        data-no-ripple
        aria-current={current ? 'page' : undefined}
        title={t(`common:nav.${target}`)}
        onClick={() => onNavigate(target)}
      >
        <span className="nav-icon">
          <Icon name={icon} size={18} />
        </span>
        <span className="nav-label">{t(`common:nav.${target}`)}</span>
      </button>
    );
  };

  const connected = hub?.state?.connected === true;
  const hubLabel = connected ? t('common:sidebar.hubConnected') : t('common:sidebar.hubAbsent');

  return (
    <aside className="sidebar nebula-surface nebula-sidebar app-no-drag">
      <div className="brand-lockup">
        <Logo size={40} title={t('common:app.name')} className="hub-mark" />
        <div>
          <strong>{t('common:app.name')}</strong>
          <span>{t('common:app.tagline')}</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label={t('common:nav.label')}>
        {GROUPS.map((group) => (
          <div
            key={group.id}
            className="nav-group"
            role="group"
            aria-labelledby={`nav-group-${group.id}`}
          >
            <p className="nav-group-title" id={`nav-group-${group.id}`}>
              {t(`common:nav.groups.${group.id}`)}
            </p>
            {group.sections.filter((section) => section.route !== 'news' || connected).map(navItem)}
          </div>
        ))}

        <div className="nav-group nav-group-system">
          {navItem({ route: 'settings', icon: 'gear' })}
          {hub?.onOpenApps ? (
            <button
              type="button"
              className="nav-item"
              data-sound="nav"
              data-no-ripple
              title={t('common:nebula.apps')}
              onClick={hub.onOpenApps}
            >
              <span className="nav-icon">
                <Icon name="apps" size={18} />
              </span>
              <span className="nav-label">{t('common:nebula.apps')}</span>
            </button>
          ) : null}
        </div>
      </nav>

      {hub ? (
        <button
          type="button"
          className={`link-card ${connected ? 'is-online' : 'is-offline'}`}
          data-sound="nav"
          data-no-ripple
          title={`${t('common:sidebar.hub')} · ${hubLabel}`}
          onClick={() => onNavigate('settings')}
        >
          <span className="link-card-icon">
            <Icon name="orbit" size={18} />
            <i className={`status-dot ${connected ? '' : 'off'}`} aria-hidden="true" />
          </span>
          <span className="link-card-text">
            <strong>{t('common:sidebar.hub')}</strong>
            <small>{hubLabel}</small>
          </span>
          <Icon name="chevronRight" size={14} className="link-card-chevron" />
        </button>
      ) : null}

      <p className="sidebar-foot" title={t('common:sidebar.localNote')}>
        <Icon name="shield" size={13} />
        <span>{t('common:sidebar.local')}</span>
        <small className="tabular">{t('common:sidebar.version', { version: APP_VERSION })}</small>
      </p>
    </aside>
  );
}
