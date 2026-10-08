import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiZap } from 'react-icons/fi';
import HeroBannerSlide from '@/components/shop/HeroBannerSlide';
import { heroBannerFrameClass } from '@/lib/heroBannerLayout';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchHomeFeed } from '@/store/slices/catalogSlice';
import { useDocumentTitle, useIsMobile } from '@/hooks';
import cn from '@/lib/cn';
import ProductCard from '@/components/shop/ProductCard';
import TrustStrip from '@/components/shop/TrustStrip';
import HomeShopTop from '@/components/shop/HomeShopTop';
import SellCta from '@/components/shop/SellCta';
import { ErrorState, EmptyState, ProductCardSkeleton, Skeleton, SmartImage } from '@/components/ui';
import type { Banner, Product } from '@/types';

const HERO_INTERVAL = 6000;

const isExternal = (url: string) => /^https?:\/\//i.test(url);

const BannerFrame = ({
  banner,
  className,
  children,
}: {
  banner: Banner;
  className?: string;
  children: ReactNode;
}) => {
  if (!banner.linkUrl) return <div className={className}>{children}</div>;

  if (isExternal(banner.linkUrl)) {
    return (
      <a href={banner.linkUrl} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link to={banner.linkUrl} className={className}>
      {children}
    </Link>
  );
};

const HeroCarousel = ({ banners }: { banners: Banner[] }) => {
  const isMobile = useIsMobile();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const count = banners.length;

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setSlide((current) => (current + 1) % count);
    }, HERO_INTERVAL);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  const goTo = (next: number, nextDirection: number) => {
    setDirection(nextDirection);
    setSlide((next + count) % count);
  };

  const banner = banners[slide];
  if (!banner) return null;

  return (
    <div
      className={cn('relative overflow-hidden rounded-2xl bg-void', heroBannerFrameClass())}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0, x: direction * 48 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -48 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <HeroBannerSlide banner={banner} isMobile={isMobile} fillParent />
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(slide - 1, -1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-void/70 text-brand-400 shadow-sm transition hover:bg-void sm:left-4"
          >
            <FiChevronLeft size={19} />
          </button>
          <button
            type="button"
            onClick={() => goTo(slide + 1, 1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-void/70 text-brand-400 shadow-sm transition hover:bg-void sm:right-4"
          >
            <FiChevronRight size={19} />
          </button>
        </>
      )}
    </div>
  );
};

const FallbackHero = () => (
  <div className={cn('relative overflow-hidden rounded-2xl', heroBannerFrameClass())}>
  <HeroBannerSlide
    fillParent
    banner={{
      id: 0,
      title: 'Sell your tech. Shop pre-owned.',
      subtitle:
        'Quality pre-owned gaming & tech — or get a cash offer for what you no longer play.',
      image: null,
      mobileImage: null,
      linkUrl: '/search',
      ctaLabel: 'Shop now',
      placement: 'home_hero',
      theme: 'respawn-sell-shop',
      sortOrder: 0,
      isActive: true,
      startsAt: null,
      endsAt: null,
      clickCount: 0,
    }}
    isMobile={false}
  />
  </div>
);

const PromoStrip = ({ banners }: { banners: Banner[] }) => {
  if (!banners.length) return null;

  return (
    <section className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {banners.map((banner) => (
        <BannerFrame
          key={banner.id}
          banner={banner}
          className="block w-[min(100%,320px)] shrink-0 overflow-hidden rounded-2xl border border-ink-200 bg-ink-100 sm:w-[360px]"
        >
          <SmartImage
            src={banner.image}
            alt={banner.title}
            wrapperClassName="aspect-[16/9] w-full"
            className="h-full w-full object-cover"
          />
          {(banner.title || banner.subtitle) && (
            <div className="border-t border-ink-200 px-3 py-2.5">
              {banner.title && (
                <p className="truncate text-sm font-bold text-ink-900">{banner.title}</p>
              )}
              {banner.subtitle && (
                <p className="truncate text-xs text-ink-500">{banner.subtitle}</p>
              )}
            </div>
          )}
        </BannerFrame>
      ))}
    </section>
  );
};

const ProductRail = ({
  title,
  eyebrow,
  icon,
  products,
  seeAllTo,
}: {
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  products: Product[];
  seeAllTo: string;
}) => {
  if (!products.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-black tracking-tight text-ink-900 sm:text-xl">{title}</h2>
          </div>
          {eyebrow && <p className="mt-0.5 text-xs text-ink-500">{eyebrow}</p>}
        </div>
        <Link to={seeAllTo} className="text-sm font-bold text-brand-400">
          See all
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

const HomeSkeleton = () => (
  <div className="space-y-10">
    <Skeleton className="h-11 w-full rounded-full" />
    <Skeleton className="aspect-[16/10] w-full" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full" />
      ))}
    </div>
    {Array.from({ length: 2 }).map((_, section) => (
      <div key={section}>
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

const Home = () => {
  useDocumentTitle('Pre-owned games, consoles and tech');

  const dispatch = useAppDispatch();
  const home = useAppSelector((state) => state.catalog.home);
  const homeStatus = useAppSelector((state) => state.catalog.homeStatus);
  const catalogCategories = useAppSelector((state) => state.catalog.categories);
  const error = useAppSelector((state) => state.catalog.error);

  useEffect(() => {
    if (homeStatus === 'idle') void dispatch(fetchHomeFeed());
  }, [dispatch, homeStatus]);

  const shell = 'mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8';

  if (homeStatus === 'error') {
    return (
      <div className={shell}>
        <ErrorState
          message={error || 'We could not load the storefront right now.'}
          onRetry={() => void dispatch(fetchHomeFeed())}
        />
      </div>
    );
  }

  if (!home) {
    return (
      <div className={shell}>
        <HomeSkeleton />
      </div>
    );
  }

  const isEmptyStorefront =
    home.heroBanners.length === 0 &&
    home.promoStrip.length === 0 &&
    home.categories.length === 0 &&
    home.featured.length === 0 &&
    home.newArrivals.length === 0 &&
    home.bestSellers.length === 0 &&
    home.onSale.length === 0;

  if (isEmptyStorefront) {
    return (
      <div className={shell}>
        <EmptyState
          title="Your storefront is ready"
          message="Add categories, products and banners from the admin dashboard to start selling."
        />
      </div>
    );
  }

  return (
    <div className={cn(shell, 'space-y-8 lg:space-y-12')}>
      {home.heroBanners.length > 0 ? (
        <HeroCarousel banners={home.heroBanners} />
      ) : (
        <FallbackHero />
      )}

      <HomeShopTop
        categories={home.categories.length > 0 ? home.categories : catalogCategories}
      />

      <SellCta />

      {home.promoStrip.length > 0 && <PromoStrip banners={home.promoStrip} />}

      <ProductRail
        title="Featured Consoles"
        products={home.featured}
        seeAllTo="/search?featured=true"
      />
      <ProductRail
        title="Just Landed"
        eyebrow="New stock added today"
        icon={<FiZap className="text-brand-400" size={20} />}
        products={home.newArrivals}
        seeAllTo="/search?sort=newest"
      />
      <ProductRail title="Best sellers" products={home.bestSellers} seeAllTo="/search?sort=popular" />
      <ProductRail title="On sale" products={home.onSale} seeAllTo="/search?onSale=true" />

      <TrustStrip />
    </div>
  );
};

export default Home;
