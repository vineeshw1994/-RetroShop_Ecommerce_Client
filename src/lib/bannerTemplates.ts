import type { Banner } from '@/types';

/** Stored in Banner.theme. `custom` = image-led slide (upload artwork). */
export const BANNER_THEME_CUSTOM = 'custom';

export type BannerTemplateId =
  | 'respawn-sell-shop'
  | 'console-drop'
  | 'trade-in-purple'
  | 'shop-cyan-burst'
  | 'centered-minimal'
  | 'split-glow-right'
  | 'promo-badge'
  | 'warranty-trust'
  | 'dual-action-dark'
  | 'gaming-neon-frame';

export interface BannerTemplateDefinition {
  id: BannerTemplateId;
  name: string;
  description: string;
  /** Suggested defaults when creating from this template */
  defaults: {
    title: string;
    subtitle: string;
    ctaLabel: string;
    secondaryCtaLabel?: string;
    secondaryHref?: string;
  };
  layout: BannerTemplateId;
}

export const BANNER_TEMPLATES: BannerTemplateDefinition[] = [
  {
    id: 'respawn-sell-shop',
    name: 'Sell & shop',
    description: 'Dual CTAs — matches the default Respawn hero.',
    defaults: {
      title: 'Sell your tech. Shop pre-owned.',
      subtitle: 'Quality pre-owned gaming & tech — or get a cash offer for what you no longer play.',
      ctaLabel: 'Shop now',
      secondaryCtaLabel: 'Sell to us',
      secondaryHref: '/sell',
    },
    layout: 'respawn-sell-shop',
  },
  {
    id: 'console-drop',
    name: 'New stock drop',
    description: 'Eyebrow + bold headline, single primary button.',
    defaults: {
      title: 'New consoles in stock now',
      subtitle: 'PS5, Xbox Series X|S and Switch — tested, graded and ready to ship.',
      ctaLabel: 'Browse consoles',
    },
    layout: 'console-drop',
  },
  {
    id: 'trade-in-purple',
    name: 'Trade-in focus',
    description: 'Purple glow accent for sell / trade messaging.',
    defaults: {
      title: 'Get a fair price for your gear',
      subtitle: 'Instant quote online — drop off in store or post it to us.',
      ctaLabel: 'Get a quote',
      secondaryCtaLabel: 'How it works',
      secondaryHref: '/sell',
    },
    layout: 'trade-in-purple',
  },
  {
    id: 'shop-cyan-burst',
    name: 'Shop cyan burst',
    description: 'Bright cyan headline on dark gradient.',
    defaults: {
      title: 'Pre-owned tech that plays like new',
      subtitle: 'Every item graded, cleaned and covered by our 12-month warranty.',
      ctaLabel: 'Shop all',
    },
    layout: 'shop-cyan-burst',
  },
  {
    id: 'centered-minimal',
    name: 'Centered minimal',
    description: 'Stacked copy, centred on all breakpoints.',
    defaults: {
      title: 'Play more. Pay less.',
      subtitle: 'Certified pre-owned games, consoles and accessories.',
      ctaLabel: 'Start shopping',
    },
    layout: 'centered-minimal',
  },
  {
    id: 'split-glow-right',
    name: 'Split glow',
    description: 'Left-aligned copy with soft glow on the right.',
    defaults: {
      title: 'Upgrade your setup',
      subtitle: 'Controllers, headsets and storage — all in one place.',
      ctaLabel: 'View accessories',
    },
    layout: 'split-glow-right',
  },
  {
    id: 'promo-badge',
    name: 'Promo badge',
    description: 'Highlight a sale or percentage off.',
    defaults: {
      title: 'Big savings this week',
      subtitle: 'Selected titles and hardware — while stock lasts.',
      ctaLabel: 'See deals',
    },
    layout: 'promo-badge',
  },
  {
    id: 'warranty-trust',
    name: 'Trust & warranty',
    description: 'Reassurance-led messaging with icon row.',
    defaults: {
      title: 'Buy with confidence',
      subtitle: 'Fully tested, free delivery, 12-month warranty on every order.',
      ctaLabel: 'Learn more',
    },
    layout: 'warranty-trust',
  },
  {
    id: 'dual-action-dark',
    name: 'Dual action dark',
    description: 'Two equal buttons on a flat dark panel.',
    defaults: {
      title: 'We buy and sell gaming & tech',
      subtitle: 'Same-day quotes on trade-ins. Next-day delivery on orders.',
      ctaLabel: 'Shop pre-owned',
      secondaryCtaLabel: 'Sell to us',
      secondaryHref: '/sell',
    },
    layout: 'dual-action-dark',
  },
  {
    id: 'gaming-neon-frame',
    name: 'Neon frame',
    description: 'Bordered hero with gaming neon accents.',
    defaults: {
      title: 'Level up for less',
      subtitle: 'From retro classics to the latest releases.',
      ctaLabel: 'Explore games',
    },
    layout: 'gaming-neon-frame',
  },
];

const TEMPLATE_MAP = new Map(BANNER_TEMPLATES.map((entry) => [entry.id, entry]));

export const getBannerTemplate = (theme: string | null | undefined) => {
  if (!theme || theme === BANNER_THEME_CUSTOM) return null;
  return TEMPLATE_MAP.get(theme as BannerTemplateId) ?? null;
};

export const isTemplateBanner = (banner: Pick<Banner, 'theme'>) =>
  Boolean(getBannerTemplate(banner.theme));

export const resolveTemplateDefaults = (templateId: BannerTemplateId) =>
  TEMPLATE_MAP.get(templateId)?.defaults;
