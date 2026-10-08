import cn from '@/lib/cn';
import {
  BANNER_TEMPLATES,
  BANNER_THEME_CUSTOM,
  type BannerTemplateId,
} from '@/lib/bannerTemplates';
import HeroBannerSlide from '@/components/shop/HeroBannerSlide';
import type { Banner } from '@/types';

interface BannerTemplatePickerProps {
  value: string;
  onChange: (theme: string) => void;
  previewBanner: Pick<
    Banner,
    'title' | 'subtitle' | 'ctaLabel' | 'image' | 'mobileImage' | 'linkUrl' | 'placement'
  >;
}

const previewShell = (
  theme: string,
  previewBanner: BannerTemplatePickerProps['previewBanner']
): Banner => ({
  id: -1,
  title: previewBanner.title || 'Your headline here',
  subtitle: previewBanner.subtitle || '',
  image: previewBanner.image,
  mobileImage: previewBanner.mobileImage,
  linkUrl: previewBanner.linkUrl,
  ctaLabel: previewBanner.ctaLabel || 'Shop now',
  placement: previewBanner.placement,
  theme,
  sortOrder: 0,
  isActive: true,
  startsAt: null,
  endsAt: null,
  clickCount: 0,
});

const BannerTemplatePicker = ({ value, onChange, previewBanner }: BannerTemplatePickerProps) => {
  const options = [
    {
      id: BANNER_THEME_CUSTOM,
      name: 'Custom artwork',
      description: 'Upload a wide image; title and button overlay on top.',
    },
    ...BANNER_TEMPLATES.map((entry) => ({
      id: entry.id,
      name: entry.name,
      description: entry.description,
    })),
  ];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink-700">Hero template</p>
        <p className="mt-0.5 text-xs text-ink-500">
          Pick a layout, then edit copy and optional background image. Active banners in schedule show
          on the homepage carousel.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={cn(
                'overflow-hidden rounded-xl border text-left transition',
                selected
                  ? 'border-brand-500 ring-2 ring-brand-500/30'
                  : 'border-ink-200 hover:border-brand-400/50'
              )}
            >
              <div className="pointer-events-none scale-[0.55] origin-top-left h-[100px] w-[181%] sm:scale-[0.65] sm:h-[118px]">
                <HeroBannerSlide
                  banner={previewShell(option.id, previewBanner)}
                  isMobile={false}
                  preview
                />
              </div>
              <div className="border-t border-ink-100 bg-white px-3 py-2">
                <p className="text-xs font-bold text-ink-900">{option.name}</p>
                <p className="line-clamp-2 text-[10px] text-ink-500">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const applyTemplateDefaults = (templateId: string) => {
  if (templateId === BANNER_THEME_CUSTOM) return null;
  const match = BANNER_TEMPLATES.find((entry) => entry.id === templateId);
  return match?.defaults ?? null;
};

export type { BannerTemplateId };

export default BannerTemplatePicker;
