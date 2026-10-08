import cn from '@/lib/cn';

/** One aspect ratio for every homepage hero slide (templates + custom artwork). */
export const heroBannerFrameClass = (preview = false) =>
  cn(
    'relative w-full overflow-hidden bg-void',
    preview ? 'aspect-[21/8] min-h-[120px]' : 'aspect-[21/9] sm:aspect-[21/8]'
  );

export const heroBannerContentClass = (centered = false) =>
  cn(
    'absolute inset-0 z-[1] flex flex-col justify-center gap-1 overflow-hidden p-4 sm:gap-1.5 sm:p-6 lg:p-8',
    centered && 'items-center text-center'
  );

export const heroTitleClass =
  'line-clamp-2 max-w-lg text-lg font-black leading-tight text-white sm:text-2xl lg:text-4xl';

export const heroSubtitleClass =
  'line-clamp-2 max-w-md text-[11px] leading-snug text-white/80 sm:text-sm';

export const heroCtaPrimaryClass =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-ink-100 px-3 py-1.5 text-[11px] font-bold text-ink-900 sm:px-4 sm:py-2 sm:text-sm';

export const heroCtaSecondaryClass =
  'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full btn-glow-purple px-3 py-1.5 text-[11px] font-bold text-white sm:px-4 sm:py-2 sm:text-sm';

export const heroCtaRowClass = 'mt-1 flex max-w-full flex-row flex-wrap gap-1.5 sm:mt-2 sm:gap-2';
