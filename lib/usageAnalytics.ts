type UsageEvent = {
  name: string;
  timestamp: string;
  path?: string;
  meta?: Record<string, string | number | boolean | null | undefined>;
};

const STORAGE_KEY = 'pawveda_usage_events';
const MAX_EVENTS = 200;

const readEvents = (): UsageEvent[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeEvents = (events: UsageEvent[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    // ignore storage failures
  }
};

export const trackEvent = (name: string, meta?: UsageEvent['meta']) => {
  const event: UsageEvent = {
    name,
    timestamp: new Date().toISOString(),
    path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    meta
  };
  const events = readEvents();
  events.unshift(event);
  writeEvents(events);
};
