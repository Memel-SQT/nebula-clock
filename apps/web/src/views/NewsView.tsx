import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { newsTabFromLink, type NewsTab } from '@nebula-clock/core';
import { EmptyState, Icon, PageHeader } from '@nebula-clock/ui';
import { getDesktop } from '../lib/platform.js';

/** The tab asks the main process this often while it is on screen (the main process decides when News is really asked). */
const POLL_MS = 30 * 1000;

type ViewState = { state: 'loading' } | NewsTab;

/**
 * "Nebula News" (Nebula Hub ADR-036): the latest personal growth articles of Nebula News, as the
 * main process validated them (checked once more here, so only plain bounded texts render).
 * Asked when the view opens, every 30 s and when the window comes back, so the list appears on
 * its own once News answers. An article opens in Nebula News; the timer is never touched.
 */
export function NewsView() {
  const { t, i18n } = useTranslation(['common']);
  const [view, setView] = useState<ViewState>({ state: 'loading' });

  const load = useCallback(() => {
    const desktop = getDesktop();
    if (!desktop?.getNewsArticles) {
      setView({ state: 'unavailable' });
      return;
    }
    if (document.visibilityState !== 'visible') return;
    void desktop.getNewsArticles().then(
      (value) => {
        // The main process sends a NewsTab; re-read its list through the same check.
        const tab = value as NewsTab | null;
        setView(
          tab?.state === 'ready'
            ? newsTabFromLink({ ok: true, value: tab.articles })
            : tab?.state === 'empty'
              ? { state: 'empty' }
              : { state: 'unavailable' },
        );
      },
      () => setView({ state: 'unavailable' }),
    );
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    document.addEventListener('visibilitychange', load);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', load);
    };
  }, [load]);

  const open = (link: string) => {
    void getDesktop()
      ?.openNewsArticle?.(link)
      .catch(() => undefined);
  };
  const dateOf = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language === 'en' ? 'en-US' : 'fr-FR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));

  return (
    <div className="news-view">
      <PageHeader
        eyebrow={t('common:pages.news.eyebrow')}
        title={t('common:news.title')}
        intro={t('common:news.intro')}
      />

      {view.state === 'loading' ? (
        <p className="news-loading" role="status">
          {t('common:news.loading')}
        </p>
      ) : null}
      {view.state === 'unavailable' ? (
        <EmptyState
          icon="newspaper"
          title={t('common:news.unavailable.title')}
          description={t('common:news.unavailable.body')}
        />
      ) : null}
      {view.state === 'empty' ? (
        <EmptyState
          icon="newspaper"
          title={t('common:news.empty.title')}
          description={t('common:news.empty.body')}
        />
      ) : null}
      {view.state === 'ready' ? (
        <ul className="news-list" aria-label={view.articles.title}>
          {view.articles.items.map((item) => (
            <li key={item.deepLink}>
              <button
                type="button"
                className="news-item nebula-surface"
                data-sound="nav"
                onClick={() => open(item.deepLink)}
              >
                <span className="news-meta">
                  <strong>{item.source}</strong>
                  <time dateTime={item.publishedAt}>{dateOf(item.publishedAt)}</time>
                </span>
                <span className="news-title">{item.title}</span>
                {item.summary ? <span className="news-summary">{item.summary}</span> : null}
                <span className="news-open">
                  <Icon name="external" size={14} />
                  {t('common:news.open')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
