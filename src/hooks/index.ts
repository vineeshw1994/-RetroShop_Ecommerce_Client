import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { shopService } from '@/services/shop.service';
import type { ShopSettings } from '@/types';

const DEFAULT_SHOP_SETTINGS: ShopSettings = { returnDays: 14 };
let settingsCache: ShopSettings | null = null;
let settingsPromise: Promise<ShopSettings> | null = null;

const loadShopSettings = async () => {
  if (settingsCache) return settingsCache;
  if (!settingsPromise) {
    settingsPromise = shopService
      .getSettings()
      .then((response) => {
        settingsCache = response.data;
        return settingsCache;
      })
      .catch(() => DEFAULT_SHOP_SETTINGS)
      .finally(() => {
        settingsPromise = null;
      });
  }
  return settingsPromise;
};

/** Public shop settings used across the storefront (return window, etc.). */
export const useShopSettings = () => {
  const [settings, setSettings] = useState<ShopSettings>(settingsCache || DEFAULT_SHOP_SETTINGS);
  const [loading, setLoading] = useState(!settingsCache);

  useEffect(() => {
    let cancelled = false;

    void loadShopSettings().then((next) => {
      if (!cancelled) {
        setSettings(next);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { settings, loading, returnDays: settings.returnDays };
};

export const invalidateShopSettingsCache = () => {
  settingsCache = null;
};

/** Debounce a fast-changing value, e.g. a search box. */
export const useDebounce = <T,>(value: T, delay = 350): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

/** True when the given media query matches, kept in sync on resize. */
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
};

export const useIsMobile = () => useMediaQuery('(max-width: 767px)');

/** Run a handler when a click or touch lands outside the returned ref. */
export const useClickOutside = <T extends HTMLElement>(handler: () => void) => {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handlerRef.current();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, []);

  return ref;
};

/**
 * Read and write the query string as the single source of truth for list
 * filters, so pagination and filters survive refresh and back navigation.
 */
export const useQueryFilters = <T extends Record<string, string>>(defaults: T) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const result = { ...defaults };
    (Object.keys(defaults) as (keyof T)[]).forEach((key) => {
      const value = searchParams.get(String(key));
      if (value !== null) result[key] = value as T[keyof T];
    });
    return result;
  }, [searchParams, defaults]);

  const setFilter = useCallback(
    (updates: Partial<Record<keyof T, string | number | boolean | undefined>>, resetPage = true) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);

          Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined || value === '' || value === false) next.delete(key);
            else next.set(key, String(value));
          });

          if (resetPage && !('page' in updates)) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const resetFilters = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

  return { filters, setFilter, resetFilters, searchParams };
};

/**
 * Permission gate for admin UI.
 * Super admins always pass; staff are checked against their granted keys.
 */
export const usePermissions = () => {
  const admin = useAppSelector((state) => state.adminAuth.admin);
  const modules = useAppSelector((state) => state.adminAuth.permissionModules);

  const granted = useMemo(() => new Set(admin?.permissions || []), [admin?.permissions]);

  const can = useCallback(
    (...required: string[]) => {
      if (!admin) return false;
      if (admin.role === 'super_admin') return true;
      return required.every((permission) => granted.has(permission));
    },
    [admin, granted]
  );

  const canAny = useCallback(
    (...required: string[]) => {
      if (!admin) return false;
      if (admin.role === 'super_admin') return true;
      return required.some((permission) => granted.has(permission));
    },
    [admin, granted]
  );

  return {
    admin,
    modules,
    can,
    canAny,
    isSuperAdmin: admin?.role === 'super_admin',
  };
};

/** Set the document title for a page. */
export const useDocumentTitle = (title: string, suffix = 'Retro Shop') => {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${suffix}` : suffix;
    return () => {
      document.title = previous;
    };
  }, [title, suffix]);
};

/**
 * Generic async loader with loading/error state and a manual `reload`.
 * Used by pages that fetch once per filter change without needing Redux.
 */
export const useAsync = <T,>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  options: { immediate?: boolean } = {}
) => {
  const { immediate = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (caught) {
      setError((caught as Error)?.message || 'Could not load this data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (immediate) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run, setData };
};
