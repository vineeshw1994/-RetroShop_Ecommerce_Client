import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiChevronRight,
  FiFilter,
  FiGrid,
  FiList,
  FiSearch,
  FiShoppingCart,
  FiX,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToBasket } from '@/store/slices/basketSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { shopService, type ProductQuery } from '@/services/shop.service';
import { useAsync, useDocumentTitle, useQueryFilters } from '@/hooks';
import { conditionLabel, formatNumber, formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import ProductCard from '@/components/shop/ProductCard';
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorState,
  Pagination,
  ProductGridSkeleton,
  Select,
  Skeleton,
  SmartImage,
  StarRating,
  Switch,
} from '@/components/ui';
import type { FilterOptions, Product } from '@/types';

const PAGE_SIZE = 24;

/* Kept at module scope: `useQueryFilters` memoises on this object identity. */
const CATALOG_DEFAULTS = {
  page: '1',
  search: '',
  category: '',
  platform: '',
  condition: '',
  brand: '',
  minPrice: '',
  maxPrice: '',
  inStock: '',
  onSale: '',
  featured: '',
  minRating: '',
  ids: '',
  sort: 'newest',
  view: 'grid',
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'popular', label: 'Most popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
  { value: 'oldest', label: 'Oldest first' },
];

const RATING_OPTIONS = [4, 3, 2];

const toList = (value: string) => (value ? value.split(',').filter(Boolean) : []);

const toggleInList = (value: string, entry: string) => {
  const list = toList(value);
  const next = list.includes(entry) ? list.filter((item) => item !== entry) : [...list, entry];
  return next.join(',');
};

interface FilterRailProps {
  options: FilterOptions | null;
  filters: typeof CATALOG_DEFAULTS;
  setFilter: (
    updates: Partial<Record<keyof typeof CATALOG_DEFAULTS, string | number | boolean | undefined>>,
    resetPage?: boolean
  ) => void;
  activeCount: number;
  onClear: () => void;
}

const FilterRail = ({ options, filters, setFilter, activeCount, onClear }: FilterRailProps) => {
  const [minPrice, setMinPrice] = useState(filters.minPrice);
  const [maxPrice, setMaxPrice] = useState(filters.maxPrice);

  // Re-sync the uncommitted price inputs when the URL changes underneath them.
  useEffect(() => setMinPrice(filters.minPrice), [filters.minPrice]);
  useEffect(() => setMaxPrice(filters.maxPrice), [filters.maxPrice]);

  const platforms = toList(filters.platform);
  const conditions = toList(filters.condition);
  const brands = toList(filters.brand);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-ink-900">
          Filters
          {activeCount > 0 && (
            <Badge tone="brand" className="ml-2">
              {activeCount}
            </Badge>
          )}
        </p>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-bold text-brand-600 transition hover:text-brand-700"
          >
            Clear all
          </button>
        )}
      </div>

      {!options ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <>
          {options.platforms.length > 0 && (
            <fieldset>
              <legend className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                Platform
              </legend>
              <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
                {options.platforms.map((platform) => (
                  <Checkbox
                    key={platform.value}
                    checked={platforms.includes(platform.value)}
                    onChange={() =>
                      setFilter({ platform: toggleInList(filters.platform, platform.value) })
                    }
                    label={`${platform.value} (${platform.count})`}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {options.conditions.length > 0 && (
            <fieldset>
              <legend className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                Condition
              </legend>
              <div className="space-y-2.5">
                {options.conditions.map((condition) => (
                  <Checkbox
                    key={condition.value}
                    checked={conditions.includes(condition.value)}
                    onChange={() =>
                      setFilter({ condition: toggleInList(filters.condition, condition.value) })
                    }
                    label={condition.label}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {options.brands.length > 0 && (
            <fieldset>
              <legend className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                Brand
              </legend>
              <div className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
                {options.brands.map((brand) => (
                  <Checkbox
                    key={brand.value}
                    checked={brands.includes(brand.value)}
                    onChange={() => setFilter({ brand: toggleInList(filters.brand, brand.value) })}
                    label={`${brand.value} (${brand.count})`}
                  />
                ))}
              </div>
            </fieldset>
          )}

          <fieldset>
            <legend className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">
              Price
            </legend>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={minPrice}
                placeholder={String(options.priceRange.min)}
                aria-label="Minimum price"
                onChange={(event) => setMinPrice(event.target.value)}
                onBlur={() => setFilter({ minPrice })}
                onKeyDown={(event) => event.key === 'Enter' && setFilter({ minPrice })}
                className="input-base px-2.5 py-2"
              />
              <span className="text-sm text-ink-400">to</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                value={maxPrice}
                placeholder={String(options.priceRange.max)}
                aria-label="Maximum price"
                onChange={(event) => setMaxPrice(event.target.value)}
                onBlur={() => setFilter({ maxPrice })}
                onKeyDown={(event) => event.key === 'Enter' && setFilter({ maxPrice })}
                className="input-base px-2.5 py-2"
              />
            </div>
          </fieldset>

          <div className="space-y-3 border-t border-ink-100 pt-5">
            <Switch
              checked={filters.inStock === 'true'}
              onChange={(next) => setFilter({ inStock: next ? 'true' : undefined })}
              label="In stock only"
            />
            <Switch
              checked={filters.onSale === 'true'}
              onChange={(next) => setFilter({ onSale: next ? 'true' : undefined })}
              label="On sale"
            />
          </div>

          <fieldset className="border-t border-ink-100 pt-5">
            <legend className="mb-2.5 text-xs font-bold uppercase tracking-wide text-ink-400">
              Customer rating
            </legend>
            <div className="space-y-1.5">
              {RATING_OPTIONS.map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() =>
                    setFilter({
                      minRating: filters.minRating === String(rating) ? undefined : rating,
                    })
                  }
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 transition',
                    filters.minRating === String(rating)
                      ? 'bg-brand-50 ring-1 ring-brand-200'
                      : 'hover:bg-ink-50'
                  )}
                >
                  <StarRating value={rating} size={13} showValue={false} />
                  <span className="text-xs font-medium text-ink-600">& up</span>
                </button>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
};

const ProductRow = ({ product }: { product: Product }) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const adding = useAppSelector((state) => state.basket.pendingProductId === product.id);

  const handleAdd = async () => {
    const result = await dispatch(addToBasket({ productId: product.id, isAuthenticated }));

    if (addToBasket.fulfilled.match(result)) {
      dispatch(pushToast(result.payload.message, 'success'));
    } else {
      dispatch(pushToast(String(result.payload || 'Could not add to basket'), 'error'));
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="card flex gap-4 p-3 sm:p-4"
    >
      <Link to={`/product/${product.slug}`} className="shrink-0">
        <SmartImage
          src={product.primaryImage}
          alt={product.name}
          wrapperClassName="h-28 w-28 rounded-lg sm:h-36 sm:w-36"
          className="h-full w-full object-cover"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[11px] font-medium text-ink-400">
          {product.category?.name || product.platform || conditionLabel(product.condition)}
        </p>

        <Link
          to={`/product/${product.slug}`}
          className="mt-0.5 line-clamp-2 text-sm font-bold text-ink-900 transition hover:text-brand-600 sm:text-base"
        >
          {product.name}
        </Link>

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{conditionLabel(product.condition)}</Badge>
          {product.ratingCount > 0 && (
            <StarRating value={product.ratingAverage} count={product.ratingCount} size={12} />
          )}
        </div>

        {product.shortDescription && (
          <p className="mt-2 hidden line-clamp-2 text-sm text-ink-500 sm:block">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
          <div>
            <p className="text-lg font-extrabold leading-none text-ink-900">
              {formatPrice(product.effectivePrice)}
            </p>
            {product.discountPercent > 0 && (
              <p className="mt-1 text-xs text-ink-400">
                <span className="line-through">{formatPrice(product.price)}</span>
                <span className="ml-1.5 font-bold text-brand-600">
                  -{product.discountPercent}%
                </span>
              </p>
            )}
          </div>

          <Button
            size="sm"
            onClick={handleAdd}
            loading={adding}
            disabled={!product.inStock}
            leftIcon={<FiShoppingCart size={15} />}
          >
            {product.inStock ? 'Add to basket' : 'Out of stock'}
          </Button>
        </div>
      </div>
    </motion.article>
  );
};

const Catalog = () => {
  const { slug: categorySlug } = useParams<{ slug: string }>();
  const { filters, setFilter, resetFilters } = useQueryFilters(CATALOG_DEFAULTS);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeCategory = categorySlug || filters.category;

  const category = useAsync(
    async () => (activeCategory ? (await shopService.getCategory(activeCategory)).data : null),
    [activeCategory]
  );

  const filterOptions = useAsync(
    async () => (await shopService.getFilterOptions(activeCategory || undefined)).data,
    [activeCategory]
  );

  const query = useMemo<ProductQuery>(
    () => ({
      page: Number(filters.page) || 1,
      limit: PAGE_SIZE,
      search: filters.search || undefined,
      category: activeCategory || undefined,
      platform: filters.platform || undefined,
      condition: filters.condition || undefined,
      brand: filters.brand || undefined,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      inStock: filters.inStock === 'true' || undefined,
      onSale: filters.onSale === 'true' || undefined,
      featured: filters.featured === 'true' || undefined,
      minRating: filters.minRating ? Number(filters.minRating) : undefined,
      ids: filters.ids || undefined,
      sort: filters.sort || undefined,
    }),
    [filters, activeCategory]
  );

  const products = useAsync(async () => {
    const response = await shopService.getProducts(query);
    return { items: response.data, meta: response.meta };
  }, [query]);

  const heading = category.data?.name || (filters.search ? `Search results` : 'All products');
  useDocumentTitle(filters.search ? `Search: ${filters.search}` : heading);

  const activeCount =
    toList(filters.platform).length +
    toList(filters.condition).length +
    toList(filters.brand).length +
    (filters.minPrice ? 1 : 0) +
    (filters.maxPrice ? 1 : 0) +
    (filters.inStock === 'true' ? 1 : 0) +
    (filters.onSale === 'true' ? 1 : 0) +
    (filters.minRating ? 1 : 0);

  const clearFilters = () =>
    setFilter({
      platform: undefined,
      condition: undefined,
      brand: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      inStock: undefined,
      onSale: undefined,
      featured: undefined,
      minRating: undefined,
    });

  const isListView = filters.view === 'list';
  const meta = products.data?.meta;
  const items = products.data?.items || [];

  const rail = (
    <FilterRail
      options={filterOptions.data}
      filters={filters}
      setFilter={setFilter}
      activeCount={activeCount}
      onClear={clearFilters}
    />
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
      {/* Page heading */}
      <header className="mb-6">
        {category.data ? (
          <>
            <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs">
              <Link to="/" className="font-medium text-ink-500 transition hover:text-brand-600">
                Home
              </Link>
              <FiChevronRight size={12} className="text-ink-300" />
              {category.data.parent && (
                <>
                  <Link
                    to={`/category/${category.data.parent.slug}`}
                    className="font-medium text-ink-500 transition hover:text-brand-600"
                  >
                    {category.data.parent.name}
                  </Link>
                  <FiChevronRight size={12} className="text-ink-300" />
                </>
              )}
              <span className="font-semibold text-ink-800">{category.data.name}</span>
            </nav>

            <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
              {category.data.name}
            </h1>

            {category.data.description && (
              <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{category.data.description}</p>
            )}

            {(category.data.children || []).length > 0 && (
              <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                {(category.data.children || []).map((child) => (
                  <Link
                    key={child.id}
                    to={`/category/${child.slug}`}
                    className="shrink-0 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-600"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
              {filters.search ? (
                <>
                  Search results for <span className="text-brand-600">“{filters.search}”</span>
                </>
              ) : (
                'All products'
              )}
            </h1>
            <p className="mt-1.5 text-sm text-ink-500">
              Every title is cleaned, tested and covered by the warranty shown on each product.
            </p>
          </>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[256px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto p-5">{rail}</div>
        </aside>

        <div className="min-w-0">
          {/* Toolbar */}
          <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setDrawerOpen(true)}
                leftIcon={<FiFilter size={15} />}
              >
                Filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </Button>

              <p className="text-sm text-ink-500">
                {products.loading ? (
                  'Loading…'
                ) : (
                  <>
                    <span className="font-bold text-ink-900">
                      {formatNumber(meta?.total ?? items.length)}
                    </span>{' '}
                    {(meta?.total ?? items.length) === 1 ? 'product' : 'products'}
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select
                aria-label="Sort products"
                options={SORT_OPTIONS}
                value={filters.sort}
                onChange={(event) => setFilter({ sort: event.target.value })}
                className="h-9 w-44 py-0 text-xs"
              />

              <div className="hidden items-center rounded-lg border border-ink-200 p-0.5 sm:flex">
                <button
                  type="button"
                  onClick={() => setFilter({ view: undefined }, false)}
                  aria-label="Grid view"
                  aria-pressed={!isListView}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md transition',
                    !isListView ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                  )}
                >
                  <FiGrid size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setFilter({ view: 'list' }, false)}
                  aria-label="List view"
                  aria-pressed={isListView}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-md transition',
                    isListView ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-ink-50'
                  )}
                >
                  <FiList size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          {products.loading ? (
            <ProductGridSkeleton count={12} />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={() => void products.reload()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<FiSearch size={24} />}
              title="No products match your filters"
              message="Try widening your price range or clearing a filter or two."
              action={{ label: 'Clear filters', onClick: clearFilters }}
              secondaryAction={{ label: 'Reset everything', onClick: resetFilters }}
            />
          ) : isListView ? (
            <div className="space-y-3">
              {items.map((product) => (
                <ProductRow key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            meta={meta}
            className="mt-8"
            onPageChange={(page) => {
              setFilter({ page }, false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-ink-900/55"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative flex h-full w-[88%] max-w-sm flex-col bg-white"
            >
              <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5">
                <span className="text-base font-bold text-ink-900">Filters</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
                >
                  <FiX size={19} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">{rail}</div>

              <div className="border-t border-ink-100 p-4">
                <Button fullWidth onClick={() => setDrawerOpen(false)}>
                  Show {formatNumber(meta?.total ?? items.length)} results
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Catalog;
