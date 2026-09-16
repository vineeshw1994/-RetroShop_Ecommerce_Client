import { useEffect } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';

/** Lock page scroll while `active` is true (ref-counted; safe for nested overlays). */
export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [active]);
};
