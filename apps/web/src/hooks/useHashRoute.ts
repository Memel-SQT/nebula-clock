import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['timer', 'tasks', 'stats', 'calendar', 'settings'] as const;
export type Route = (typeof ROUTES)[number];

function currentRoute(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return (ROUTES as readonly string[]).includes(hash) ? (hash as Route) : 'timer';
}

/**
 * Minimal hash router.
 *
 * Hash routing rather than the History API because the same bundle is served
 * from a GitHub Pages subpath *and* loaded over `file://` inside Electron,
 * where server-side rewrites are not available. Five views do not justify a
 * routing dependency.
 */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? 'timer' : currentRoute(),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = `#/${next}`;
    setRoute(next);
  }, []);

  return [route, navigate];
}
