let lockCount = 0;

let savedOverflow = '';
let savedPaddingRight = '';

/** Prevent background scroll while overlays/modals are open. Ref-counted for nested overlays. */
export const lockBodyScroll = () => {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  lockCount += 1;
};

export const unlockBodyScroll = () => {
  if (lockCount <= 0) return;

  lockCount -= 1;

  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
  }
};

/** Safety net when navigating away while an overlay was open. */
export const resetBodyScrollLock = () => {
  lockCount = 0;
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  savedOverflow = '';
  savedPaddingRight = '';
};
