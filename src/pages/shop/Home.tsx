import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiArrowRight, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchHomeFeed } from '@/store/slices/catalogSlice';
import { useDocumentTitle, useIsMobile } from '@/hooks';
import { formatNumber } from '@/lib/format';
import cn from '@/lib/cn';
import ProductCard from '@/components/shop/ProductCard';
import { ErrorState, EmptyState, ProductCardSkeleton, Skeleton, SmartImage } from '@/components/ui';
import type { Banner, Category, Product } from '@/types';

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
  const [slide, setSlide] = useState({ index: 0, direction: 1 });
  const [paused, setPaused] = useState(false);

  const count = banners.length;

  useEffect(() => {
    if (paused || count < 2) return;

    const timer = window.setInterval(
      () => setSlide((current) => ({ index: (current.index + 1) % count, direction: 1 })),
      HERO_INTERVAL
    );

    return () => window.clearInterval(timer);
  }, [paused, count]);

  const goTo = (next: number, direction: number) =>
    setSlide({ index: (next + count) % count, direction });

  const banner = banners[slide.index];
  if (!banner) return null;

  return (
    <div
      className="relative overflow-hidden rounded-[--radius-card] bg-ink-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="relative aspect-[16/10] sm:aspect-[21/9] lg:aspect-[16/8]">
        <AnimatePresence initial={false}>
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, x: slide.direction * 48 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slide.direction * -48 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute inset-0"
          >
            <BannerFrame banner={banner} className="block h-full w-full">
              <SmartImage
                src={isMobile ? banner.mobileImage || banner.image : banner.image}
                alt={banner.title}
                eager
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/45 to-transparent" />

              <div className="absolute inset-0 flex flex-col justify-center gap-2 p-5 sm:p-8 lg:p-12">
                <h2 className="max-w-md text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                  {banner.title}
                </h2>

                {banner.subtitle && (
                  <p className="max-w-sm text-sm text-white/80 sm:text-base">{banner.subtitle}</p>
                )}

                {banner.ctaLabel && (
                  <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white">
                    {banner.ctaLabel}
                    <FiArrowRight size={15} />
                  </span>
                )}
              </div>
            </BannerFrame>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(slide.index - 1, -1)}
            aria-label="Previous banner"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-800 shadow-sm transition hover:bg-white sm:left-4 sm:h-11 sm:w-11"
          >
            <FiChevronLeft size={19} />
          </button>

          <button
            type="button"
            onClick={() => goTo(slide.index + 1, 1)}
            aria-label="Next banner"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-ink-800 shadow-sm transition hover:bg-white sm:right-4 sm:h-11 sm:w-11"
          >
            <FiChevronRight size={19} />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {banners.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => goTo(index, index > slide.index ? 1 : -1)}
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === slide.index}
                className={cn(
                  'h-2 rounded-full transition-all',
                  index === slide.index ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const SideBanner = ({ banner }: { banner: Banner }) => (
  <BannerFrame
    banner={banner}
    className="group relative block overflow-hidden rounded-[--radius-card] bg-ink-900"
  >
    <div className="relative aspect-[16/10] lg:h-full lg:aspect-auto">
      <SmartImage
        src={banner.image}
        alt={banner.title}
        wrapperClassName="h-full w-full"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 to-ink-900/10" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <p className="text-lg font-black leading-tight text-white">{banner.title}</p>
        {banner.subtitle && <p className="mt-1 text-sm text-white/75">{banner.subtitle}</p>}
        {banner.ctaLabel && (
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand-400">
            {banner.ctaLabel}
            <FiArrowRight size={14} />
          </span>
        )}
      </div>
    </div>
  </BannerFrame>
);

const PromoStrip = ({ banners }: { banners: Banner[] }) => (
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {banners.map((banner) => (
      <BannerFrame
        key={banner.id}
        banner={banner}
        className="card flex items-center gap-3 p-3.5 transition hover:border-brand-200 hover:shadow-lift"
      >
        {banner.image ? (
          <SmartImage
            src={banner.image}
            alt={banner.title}
            wrapperClassName="h-10 w-10 shrink-0 rounded-full"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="h-10 w-10 shrink-0 rounded-full bg-brand-50" />
        )}

        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-ink-900">{banner.title}</span>
          {banner.subtitle && (
            <span className="block truncate text-xs text-ink-500">{banner.subtitle}</span>
          )}
        </span>
      </BannerFrame>
    ))}
  </div>
);

const CategoryTiles = ({ categories }: { categories: Category[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
    {categories.map((category) => (
      <motion.div
        key={category.id}
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.3 }}
      >
        <Link
          to={`/category/${category.slug}`}
          className="card group flex h-full flex-col items-center gap-3 p-4 text-center transition hover:border-brand-200 hover:shadow-lift"
        >
          <SmartImage
            src={category.image}
            alt={category.name}
            wrapperClassName="h-16 w-16 rounded-full"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />

          <span className="text-sm font-bold leading-snug text-ink-800 group-hover:text-brand-600">
            {category.name}
          </span>

          {category.productCount !== undefined && (
            <span className="mt-auto text-[11px] font-medium text-ink-400">
              {formatNumber(category.productCount)} items
            </span>
          )}
        </Link>
      </motion.div>
    ))}
  </div>
);

const ProductRail = ({
  title,
  products,
  seeAllTo,
}: {
  title: string;
  products: Product[];
  seeAllTo: string;
}) => {
  if (!products.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-lg font-black tracking-tight text-ink-900 sm:text-xl">{title}</h2>

        <div className="flex items-center gap-2">
          <Link
            to={seeAllTo}
            className="text-sm font-bold text-brand-600 transition hover:text-brand-700"
          >
            See all
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
};

const HomeSkeleton = () => (
  <div className="space-y-10">
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="aspect-[16/10] w-full lg:col-span-2 lg:aspect-[16/8]" />
      <Skeleton className="hidden w-full lg:block" />
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-[70px] w-full" />
      ))}
    </div>

    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full" />
      ))}
    </div>

    {Array.from({ length: 2 }).map((_, section) => (
      <div key={section}>
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
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

  const sideBanner = home.sideBanners[0];

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
    <div className={cn(shell, 'space-y-10 lg:space-y-14')}>
      {home.heroBanners.length > 0 && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HeroCarousel banners={home.heroBanners} />
          </div>
          {sideBanner && <SideBanner banner={sideBanner} />}
        </section>
      )}

      {home.promoStrip.length > 0 && <PromoStrip banners={home.promoStrip} />}

      {home.categories.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-lg font-black tracking-tight text-ink-900 sm:text-xl">
              Shop by category
            </h2>
            <Link
              to="/search"
              className="text-sm font-bold text-brand-600 transition hover:text-brand-700"
            >
              Browse everything
            </Link>
          </div>

          <CategoryTiles categories={home.categories} />
        </section>
      )}

      <ProductRail
        title="Recommended for you"
        products={home.featured}
        seeAllTo="/search?featured=true"
      />
      <ProductRail title="New arrivals" products={home.newArrivals} seeAllTo="/search?sort=newest" />
      <ProductRail title="Best sellers" products={home.bestSellers} seeAllTo="/search?sort=popular" />
      <ProductRail title="On sale" products={home.onSale} seeAllTo="/search?onSale=true" />
    </div>
  );
};

export default Home;
