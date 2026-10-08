import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiChevronDown,
  FiGrid,
  FiSliders,
} from 'react-icons/fi';
import cn from '@/lib/cn';
import { SmartImage } from '@/components/ui';
import type { Category } from '@/types';

const CATEGORY_SLOTS = [
  { key: 'consoles', label: 'Consoles', match: /console|switch|playstation|xbox|ps5|nintendo|wii/i },
  { key: 'games', label: 'Games', match: /game/i },
  { key: 'tablet', label: 'Tablet', match: /tablet|ipad|android/i },
  { key: 'accessories', label: 'Accessories', match: /accessor|controller|headset|cable|charg|storage/i },
] as const;

type HomeCategory = Category & { displayName: string; placeholder?: boolean };

const pickHomeCategories = (categories: Category[]): HomeCategory[] => {
  const used = new Set<number>();

  const fromSlots = CATEGORY_SLOTS.map((slot) => {
    const match = categories.find((category) => !used.has(category.id) && slot.match.test(category.name));
    if (match) {
      used.add(match.id);
      return { ...match, displayName: match.name };
    }
    return null;
  });

  const filled = fromSlots.map((entry, index) => {
    if (entry) return entry;
    const extra = categories.find((category) => !used.has(category.id));
    if (extra) {
      used.add(extra.id);
      return { ...extra, displayName: extra.name };
    }
    const slot = CATEGORY_SLOTS[index];
    return {
      id: -index - 1,
      name: slot.label,
      slug: slot.key,
      description: null,
      image: null,
      displayName: slot.label,
      placeholder: true,
      parentId: null,
      sortOrder: index,
      isActive: true,
      isFeatured: index === 0,
      productCount: 0,
    } satisfies HomeCategory;
  });

  return filled;
};

const BRAND_LINKS = [
  {
    label: 'Nintendo Switch',
    brand: 'Nintendo',
    accent: 'border-rose-500/40 hover:border-brand-400',
    logo: (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#E60012] text-[10px] font-black text-white">
        NS
      </span>
    ),
  },
  {
    label: 'PlayStation',
    brand: 'PlayStation',
    accent: 'border-ink-300 hover:border-brand-400',
    logo: (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#003791] text-[11px] font-black text-white">
        PS
      </span>
    ),
  },
  {
    label: 'Xbox',
    brand: 'Xbox',
    accent: 'border-emerald-500/40 hover:border-brand-400',
    logo: (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#107C10] text-[11px] font-black text-white">
        X
      </span>
    ),
  },
  {
    label: 'Other',
    brand: '',
    accent: 'border-ink-300 hover:border-brand-400',
    logo: (
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-ink-200 text-ink-600">
        <FiGrid size={14} />
      </span>
    ),
  },
] as const;

const QUICK_FILTERS = [
  { label: 'Price', to: '/search?sort=price_asc' },
  { label: 'Condition', to: '/search' },
  { label: 'Storage', to: '/search' },
  { label: 'Model', to: '/search' },
] as const;

const CategoryGrid = ({ categories }: { categories: Category[] }) => {
  const tiles = useMemo(() => pickHomeCategories(categories), [categories]);

  return (
    <section aria-label="Shop by category">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((category, index) => {
          const to = category.placeholder ? '/search' : `/category/${category.slug}`;

          return (
            <Link
              key={`${category.id}-${category.slug}`}
              to={to}
              className={cn(
                'group relative overflow-hidden rounded-2xl border bg-ink-100 shadow-card transition hover:border-brand-500/50 hover:shadow-lift',
                index === 0
                  ? 'border-brand-500/70 ring-1 ring-brand-500/40 shadow-glow'
                  : 'border-ink-200/80'
              )}
            >
              <SmartImage
                src={category.image}
                alt={category.displayName}
                wrapperClassName="aspect-[4/5] w-full bg-gradient-to-br from-ink-50 via-ink-100 to-accent-600/15 sm:aspect-[5/6]"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void/90 via-void/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-3">
                <span className="text-sm font-bold text-white sm:text-base">{category.displayName}</span>
                <FiArrowRight className="shrink-0 text-brand-400" size={16} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

const ShopByBrand = () => (
  <section>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-black tracking-tight text-ink-900">Shop by Brand</h2>
      <Link
        to="/search"
        className="inline-flex items-center gap-1 text-sm font-bold text-brand-400 hover:text-brand-500"
      >
        See all
        <FiArrowRight size={14} />
      </Link>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {BRAND_LINKS.map((brand, index) => (
        <Link
          key={brand.label}
          to={brand.brand ? `/search?brand=${encodeURIComponent(brand.brand)}` : '/search'}
          className={cn(
            'flex items-center gap-2.5 rounded-full border bg-ink-100 px-3 py-2.5 transition sm:px-4 sm:py-3',
            brand.accent,
            index === 0 && 'border-brand-500/60 ring-1 ring-brand-500/25'
          )}
        >
          {brand.logo}
          <span className="truncate text-xs font-bold text-ink-900 sm:text-sm">{brand.label}</span>
        </Link>
      ))}
    </div>
  </section>
);

const HomeFilterBar = () => (
  <section aria-label="Quick filters" className="no-scrollbar flex gap-2 overflow-x-auto pb-0.5">
    {QUICK_FILTERS.map((filter) => (
      <Link
        key={filter.label}
        to={filter.to}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-300 bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-brand-400 hover:text-brand-400"
      >
        {filter.label}
        <FiChevronDown size={14} className="text-ink-400" />
      </Link>
    ))}
    <Link
      to="/search"
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-300 bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-800 transition hover:border-brand-400 hover:text-brand-400 sm:ml-0"
    >
      <FiSliders size={14} className="text-brand-400" />
      Sort
    </Link>
  </section>
);

const HomeShopTop = ({ categories }: { categories: Category[] }) => (
  <div className="space-y-6">
    <CategoryGrid categories={categories} />
    <ShopByBrand />
    <HomeFilterBar />
  </div>
);

export default HomeShopTop;
