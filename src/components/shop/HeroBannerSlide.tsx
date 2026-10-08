import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiShield, FiTruck } from 'react-icons/fi';
import cn from '@/lib/cn';
import {
  BANNER_THEME_CUSTOM,
  getBannerTemplate,
  type BannerTemplateId,
} from '@/lib/bannerTemplates';
import {
  heroBannerContentClass,
  heroBannerFrameClass,
  heroCtaPrimaryClass,
  heroCtaRowClass,
  heroCtaSecondaryClass,
  heroSubtitleClass,
  heroTitleClass,
} from '@/lib/heroBannerLayout';
import { SmartImage } from '@/components/ui';
import type { Banner } from '@/types';

const isExternal = (url: string) => /^https?:\/\//i.test(url);

const PrimaryCta = ({
  banner,
  className,
  children,
}: {
  banner: Banner;
  className?: string;
  children: React.ReactNode;
}) => {
  const label = children;
  if (!banner.linkUrl) {
    return (
      <span className={className}>
        {label}
        <FiArrowRight size={14} aria-hidden />
      </span>
    );
  }
  if (isExternal(banner.linkUrl)) {
    return (
      <a href={banner.linkUrl} target="_blank" rel="noreferrer" className={className}>
        {label}
        <FiArrowRight size={14} aria-hidden />
      </a>
    );
  }
  return (
    <Link to={banner.linkUrl} className={className}>
      {label}
      <FiArrowRight size={14} aria-hidden />
    </Link>
  );
};

const SecondaryCta = ({ href, label, className }: { href: string; label: string; className?: string }) => {
  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
        <FiArrowRight size={14} aria-hidden />
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {label}
      <FiArrowRight size={14} aria-hidden />
    </Link>
  );
};

const splitTitleHighlight = (title: string) => {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return { lead: title, accent: null as string | null };
  const accent = parts.slice(-2).join(' ');
  const lead = parts.slice(0, -2).join(' ');
  if (!lead) return { lead: parts.slice(0, -1).join(' '), accent: parts[parts.length - 1] };
  return { lead: `${lead} `, accent };
};

interface HeroBannerSlideProps {
  banner: Banner;
  isMobile: boolean;
  preview?: boolean;
  /** Fills a parent that already defines hero aspect (carousel). */
  fillParent?: boolean;
}

const HeroBannerSlide = ({
  banner,
  isMobile,
  preview = false,
  fillParent = false,
}: HeroBannerSlideProps) => {
  const template = getBannerTemplate(banner.theme);
  const isCustomArtwork =
    banner.theme === BANNER_THEME_CUSTOM || (!banner.theme && Boolean(banner.image));

  const imageSrc = isMobile ? banner.mobileImage || banner.image : banner.image;
  const frame = fillParent
    ? 'absolute inset-0 h-full w-full overflow-hidden bg-void'
    : heroBannerFrameClass(preview);

  if (isCustomArtwork && banner.image) {
    const showCopy = Boolean(banner.title?.trim() || banner.subtitle?.trim() || banner.ctaLabel);
    return (
      <div className={frame}>
        <SmartImage
          src={imageSrc}
          alt={banner.title}
          eager
          wrapperClassName="absolute inset-0 h-full w-full"
          className="h-full w-full object-cover"
        />
        {showCopy && (
          <>
            <div className="absolute inset-0 bg-gradient-to-r from-void/85 via-void/40 to-transparent" />
            <div className={heroBannerContentClass()}>
              {banner.title && <h2 className={heroTitleClass}>{banner.title}</h2>}
              {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
              {(banner.ctaLabel || banner.linkUrl) && (
                <div className={heroCtaRowClass}>
                  <PrimaryCta banner={banner} className={heroCtaPrimaryClass}>
                    {banner.ctaLabel || 'View offer'}
                  </PrimaryCta>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (!template) {
    return (
      <div className={cn(frame, 'flex flex-col justify-center gap-2 p-4 sm:p-6')}>
        <h2 className={heroTitleClass}>{banner.title}</h2>
        {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
        {banner.ctaLabel && (
          <PrimaryCta banner={banner} className={cn(heroCtaPrimaryClass, 'mt-1 w-fit')}>
            {banner.ctaLabel}
          </PrimaryCta>
        )}
      </div>
    );
  }

  const layout = template.layout as BannerTemplateId;
  const secondary = template.defaults.secondaryCtaLabel;
  const secondaryHref = template.defaults.secondaryHref ?? '/sell';
  const { lead, accent } = splitTitleHighlight(banner.title);
  const primaryLabel = banner.ctaLabel || template.defaults.ctaLabel || 'Shop now';
  const centered = layout === 'centered-minimal';
  const content = heroBannerContentClass(centered);

  const bgImage = imageSrc ? (
    <>
      <SmartImage
        src={imageSrc}
        alt=""
        wrapperClassName="absolute inset-0 h-full w-full"
        className="h-full w-full object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-void/75" />
    </>
  ) : null;

  const eyebrow =
    template.id === 'respawn-sell-shop' || template.id === 'dual-action-dark'
      ? 'We buy and sell'
      : template.id === 'console-drop'
        ? 'Just landed'
        : template.id === 'promo-badge'
          ? 'Limited time'
          : null;

  const renderDualCtas = () =>
    secondary ? (
      <div className={cn(heroCtaRowClass, centered && 'justify-center')}>
        <PrimaryCta
          banner={{ ...banner, linkUrl: banner.linkUrl || '/search' }}
          className={heroCtaPrimaryClass}
        >
          {primaryLabel}
        </PrimaryCta>
        <SecondaryCta href={secondaryHref} label={secondary} className={heroCtaSecondaryClass} />
      </div>
    ) : (
      <div className={heroCtaRowClass}>
        <PrimaryCta
          banner={{ ...banner, linkUrl: banner.linkUrl || '/search' }}
          className={heroCtaPrimaryClass}
        >
          {primaryLabel}
        </PrimaryCta>
      </div>
    );

  switch (layout) {
    case 'centered-minimal':
      return (
        <div className={cn(frame, 'bg-gradient-to-b from-void to-ink-100/10')}>
          {bgImage}
          <div className={content}>
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-400 sm:text-xs">
                {eyebrow}
              </p>
            )}
            <h2 className={cn(heroTitleClass, 'max-w-xl')}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'promo-badge':
      return (
        <div className={frame}>
          {bgImage}
          <div className="pointer-events-none absolute -right-6 top-2 rotate-12 rounded-lg bg-rose-500 px-3 py-1 text-sm font-black text-white shadow-lg sm:-right-8 sm:top-4 sm:px-4 sm:py-2 sm:text-xl">
            SALE
          </div>
          <div className={content}>
            <h2 className={heroTitleClass}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'warranty-trust':
      return (
        <div className={frame}>
          {bgImage}
          <div className={content}>
            <h2 className={heroTitleClass}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            <ul className="hidden flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-medium text-brand-300 sm:flex sm:text-xs">
              <li className="flex items-center gap-1">
                <FiShield size={11} aria-hidden /> 12-month warranty
              </li>
              <li className="flex items-center gap-1">
                <FiCheckCircle size={11} aria-hidden /> Fully tested
              </li>
              <li className="flex items-center gap-1">
                <FiTruck size={11} aria-hidden /> Free delivery
              </li>
            </ul>
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'gaming-neon-frame':
      return (
        <div className={cn(frame, 'shadow-[0_0_30px_rgba(34,211,238,0.12)]')}>
          {bgImage}
          <div className="pointer-events-none absolute inset-1 rounded-lg border border-accent-500/25 sm:inset-2" />
          <div className={content}>
            <h2 className={heroTitleClass}>
              {lead}
              {accent && <span className="text-brand-400">{accent}</span>}
            </h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'trade-in-purple':
      return (
        <div className={frame}>
          {bgImage}
          <div className="absolute inset-0 bg-gradient-to-r from-void via-void/90 to-accent-600/35" />
          <div className="pointer-events-none absolute -right-6 top-0 h-32 w-32 rounded-full bg-accent-500/25 blur-3xl" />
          <div className={content}>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-300 sm:text-xs">
              Trade-in
            </p>
            <h2 className={heroTitleClass}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'shop-cyan-burst':
      return (
        <div className={frame}>
          {bgImage}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/25 via-void to-void" />
          <div className={content}>
            <h2 className={heroTitleClass}>
              {lead}
              {accent && <span className="text-brand-400">{accent}</span>}
            </h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'split-glow-right':
      return (
        <div className={frame}>
          {bgImage}
          <div className="absolute inset-0 bg-gradient-to-r from-void via-void/85 to-brand-500/20" />
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
          <div className={content}>
            <h2 className={heroTitleClass}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'console-drop':
      return (
        <div className={frame}>
          {bgImage}
          <div className="absolute inset-0 bg-gradient-to-t from-void via-void/70 to-transparent" />
          <div className={content}>
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-400 sm:text-xs">
                {eyebrow}
              </p>
            )}
            <h2 className={heroTitleClass}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'dual-action-dark':
      return (
        <div className={cn(frame, 'bg-ink-100/5')}>
          {bgImage}
          <div className={content}>
            <h2 className={heroTitleClass}>{banner.title}</h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );

    case 'respawn-sell-shop':
    default:
      return (
        <div className={frame}>
          {bgImage}
          <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-accent-600/20" />
          <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
          <div className={content}>
            {eyebrow && (
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-brand-400 sm:text-xs">
                {eyebrow}
              </p>
            )}
            <h2 className={heroTitleClass}>
              {lead}
              {accent && <span className="text-brand-400">{accent}</span>}
            </h2>
            {banner.subtitle && <p className={heroSubtitleClass}>{banner.subtitle}</p>}
            {renderDualCtas()}
          </div>
        </div>
      );
  }
};

export default HeroBannerSlide;
