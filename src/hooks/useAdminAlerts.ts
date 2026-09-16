import { useCallback, useMemo, useState } from 'react';
import { useAppSelector } from '@/store';
import { adminAlertService } from '@/services/admin.service';
import {
  getUnseenAlerts,
  markAlertSeen,
  type AdminAlertCounts,
  type AdminAlertKey,
} from '@/lib/adminAlerts';
import { useAsync } from '@/hooks';

const EMPTY: AdminAlertCounts = {
  lowStockCount: 0,
  pendingRequests: 0,
  unreadContacts: 0,
  pendingReturns: 0,
};

/** Live admin alert counts with per-admin “seen” tracking in localStorage. */
export const useAdminAlerts = () => {
  const adminId = useAppSelector((state) => state.adminAuth.admin?.id);
  const [seenTick, setSeenTick] = useState(0);

  const { data, loading, error, reload } = useAsync(
    () => adminAlertService.get(),
    [adminId],
    { immediate: Boolean(adminId) }
  );

  const counts = data?.data ?? EMPTY;

  const { unseen, total } = useMemo(() => {
    void seenTick;
    return getUnseenAlerts(adminId, counts);
  }, [adminId, counts, seenTick]);

  const markSeen = useCallback(
    (key: AdminAlertKey) => {
      if (!adminId) return;
      markAlertSeen(adminId, key, counts[key]);
      setSeenTick((tick) => tick + 1);
    },
    [adminId, counts]
  );

  return { counts, unseen, total, loading, error, reload, markSeen };
};
