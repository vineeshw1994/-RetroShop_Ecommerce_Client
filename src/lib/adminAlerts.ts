export interface AdminAlertCounts {
  lowStockCount: number;
  pendingRequests: number;
  unreadContacts: number;
  pendingReturns: number;
}

export type AdminAlertKey = keyof AdminAlertCounts;

const EMPTY: AdminAlertCounts = {
  lowStockCount: 0,
  pendingRequests: 0,
  unreadContacts: 0,
  pendingReturns: 0,
};

const storageKey = (adminId: number) => `rs_admin_seen_alerts_${adminId}`;

export const readSeenAlerts = (adminId: number): AdminAlertCounts => {
  try {
    const raw = localStorage.getItem(storageKey(adminId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AdminAlertCounts>;
    return {
      lowStockCount: Number(parsed.lowStockCount) || 0,
      pendingRequests: Number(parsed.pendingRequests) || 0,
      unreadContacts: Number(parsed.unreadContacts) || 0,
      pendingReturns: Number(parsed.pendingReturns) || 0,
    };
  } catch {
    return { ...EMPTY };
  }
};

export const markAlertSeen = (adminId: number, key: AdminAlertKey, currentCount: number) => {
  const seen = readSeenAlerts(adminId);
  seen[key] = Math.max(seen[key], currentCount);
  try {
    localStorage.setItem(storageKey(adminId), JSON.stringify(seen));
  } catch {
    /* ignore quota / private mode */
  }
};

export const getUnseenCount = (
  adminId: number | undefined,
  key: AdminAlertKey,
  currentCount: number
) => {
  if (!adminId) return 0;
  const seen = readSeenAlerts(adminId);
  return Math.max(0, currentCount - seen[key]);
};

export const getUnseenAlerts = (adminId: number | undefined, counts: AdminAlertCounts) => {
  const unseen: AdminAlertCounts = { ...EMPTY };
  let total = 0;

  (Object.keys(EMPTY) as AdminAlertKey[]).forEach((key) => {
    unseen[key] = getUnseenCount(adminId, key, counts[key]);
    total += unseen[key];
  });

  return { unseen, total };
};

export const hasUnseenAlert = (
  adminId: number | undefined,
  key: AdminAlertKey,
  currentCount: number
) => getUnseenCount(adminId, key, currentCount) > 0;
