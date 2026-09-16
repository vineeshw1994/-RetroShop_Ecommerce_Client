import type { GuestBasketEntry } from '@/types';

const KEYS = {
  customerToken: 'rs_token',
  customerRefresh: 'rs_refresh',
  adminToken: 'rs_admin_token',
  adminRefresh: 'rs_admin_refresh',
  guestBasket: 'rs_guest_basket',
  recentSearches: 'rs_recent_searches',
} as const;

export type Audience = 'customer' | 'admin';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Private browsing or a full quota; tokens simply live in memory. */
  }
};

export const tokenStore = {
  getAccess: (audience: Audience) =>
    read(audience === 'admin' ? KEYS.adminToken : KEYS.customerToken),

  getRefresh: (audience: Audience) =>
    read(audience === 'admin' ? KEYS.adminRefresh : KEYS.customerRefresh),

  set: (audience: Audience, accessToken: string, refreshToken?: string) => {
    write(audience === 'admin' ? KEYS.adminToken : KEYS.customerToken, accessToken);
    if (refreshToken) {
      write(audience === 'admin' ? KEYS.adminRefresh : KEYS.customerRefresh, refreshToken);
    }
  },

  clear: (audience: Audience) => {
    write(audience === 'admin' ? KEYS.adminToken : KEYS.customerToken, null);
    write(audience === 'admin' ? KEYS.adminRefresh : KEYS.customerRefresh, null);
  },
};

/** Basket for visitors who have not signed in yet; merged on login. */
export const guestBasket = {
  read: (): GuestBasketEntry[] => {
    try {
      const parsed = JSON.parse(read(KEYS.guestBasket) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  write: (entries: GuestBasketEntry[]) => {
    write(KEYS.guestBasket, JSON.stringify(entries.slice(0, 50)));
  },

  clear: () => write(KEYS.guestBasket, null),
};

export const recentSearches = {
  read: (): string[] => {
    try {
      const parsed = JSON.parse(read(KEYS.recentSearches) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
    } catch {
      return [];
    }
  },

  push: (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentSearches.read().filter((item) => item !== trimmed)];
    write(KEYS.recentSearches, JSON.stringify(next.slice(0, 6)));
  },

  clear: () => write(KEYS.recentSearches, null),
};
