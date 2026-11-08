import { useCallback, useEffect, useState } from 'react';

export type Route =
  | { name: 'missions' }
  | { name: 'plan'; id: string }
  | { name: 'live'; id: string }
  | { name: 'report'; id: string };

/** Hash routes are plain #names (e.g. #plan-riverfront-survey), so links can be shared. */
export function routeToHash(route: Route): string {
  return route.name === 'missions' ? 'missions' : `${route.name}-${route.id}`;
}

export function hashToRoute(hash: string): Route {
  const h = hash.replace(/^#/, '');
  const match = /^(plan|live|report)-([A-Za-z0-9-]+)$/.exec(h);
  if (match) return { name: match[1] as 'plan' | 'live' | 'report', id: match[2]! };
  return { name: 'missions' };
}

const hasLocation = () =>
  typeof window !== 'undefined' && !!window.location && !!window.addEventListener;
const getHash = () => (hasLocation() ? window.location.hash : '');

/** Minimal router for the Summit demo. Replaced by Expo Router in backlog #7. */
export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => hashToRoute(getHash()));
  useEffect(() => {
    if (!hasLocation()) return;
    const onChange = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((next: Route) => {
    setRoute(next);
    if (hasLocation()) {
      try {
        window.location.hash = routeToHash(next);
        window.scrollTo?.(0, 0);
      } catch {
        // ignore
      }
    }
  }, []);
  return { route, navigate };
}
