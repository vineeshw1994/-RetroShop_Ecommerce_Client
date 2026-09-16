import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiChevronLeft,
  FiChevronRight,
  FiHeart,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiShoppingCart,
  FiStar,
  FiTruck,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToBasket } from '@/store/slices/basketSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { shopService } from '@/services/shop.service';
import { accountService } from '@/services/account.service';
import { getErrorMessage } from '@/lib/api';
import { useAsync, useDocumentTitle, useShopSettings } from '@/hooks';
import { conditionLabel, formatDate, formatPrice, warrantyLabel } from '@/lib/format';
import cn from '@/lib/cn';
import ProductCard from '@/components/shop/ProductCard';
import WarrantyRoundel from '@/components/shop/WarrantyRoundel';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Skeleton,
  SmartImage,
  Spinner,
  StarRating,
  Textarea,
} from '@/components/ui';
import type { Product, ProductImage } from '@/types';

const TABS = ['description', 'details', 'reviews'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  description: 'Description',
  details: 'Details',
  reviews: 'Reviews',
};

const Gallery = ({
  images,
  name,
  warrantyMonths,
}: {
  images: ProductImage[];
  name: string;
  warrantyMonths: number;
}) => {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => setActive(0), [name]);

  const current = images[active];

  const move = (step: number) => {
    if (images.length < 2) return;
    setActive((index) => (index + step + images.length) % images.length);
  };

  return (
    <div className="space-y-3">
      <div
        ref={frameRef}
        tabIndex={0}
        role="group"
        aria-label={`${name} images`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') move(-1);
          if (event.key === 'ArrowRight') move(1);
        }}
        onMouseMove={(event) => {
          const bounds = frameRef.current?.getBoundingClientRect();
          if (!bounds) return;
          setZoom({
            x: ((event.clientX - bounds.left) / bounds.width) * 100,
            y: ((event.clientY - bounds.top) / bounds.height) * 100,
          });
        }}
        onMouseLeave={() => setZoom(null)}
        className="card relative aspect-square overflow-hidden"
      >
        <div
          className="h-full w-full transition-transform duration-300 ease-out"
          style={
            zoom
              ? { transform: 'scale(1.6)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
              : undefined
          }
        >
          <SmartImage
            src={current?.url ?? null}
            alt={current?.alt || name}
            eager
            wrapperClassName="h-full w-full bg-white"
            className="h-full w-full object-contain p-3"
          />
        </div>

        <WarrantyRoundel months={warrantyMonths} size="md" className="left-3 top-3" />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm transition hover:bg-white"
            >
              <FiChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next image"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-700 shadow-sm transition hover:bg-white"
            >
              <FiChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === active}
              className={cn(
                'shrink-0 overflow-hidden rounded-lg border-2 transition',
                index === active ? 'border-brand-600' : 'border-ink-100 hover:border-ink-300'
              )}
            >
              <SmartImage
                src={image.url}
                alt={image.alt || `${name} thumbnail ${index + 1}`}
                wrapperClassName="h-16 w-16 sm:h-20 sm:w-20"
                className="h-full w-full object-contain p-1 bg-white"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DetailSkeleton = () => (
  <div className="grid gap-8 lg:grid-cols-2">
    <Skeleton className="aspect-square w-full" />
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  </div>
);

const ProductDetail = () => {
  const { returnDays } = useShopSettings();
  const { slug } = useParams<{ slug: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const pendingProductId = useAppSelector((state) => state.basket.pendingProductId);
  const wishlistIds = useAppSelector((state) => state.wishlist.productIds);
  const togglingId = useAppSelector((state) => state.wishlist.togglingId);

  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  const [buyingNow, setBuyingNow] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    if (!slug) throw new Error('We could not find that product.');
    return (await shopService.getProduct(slug)).data;
  }, [slug]);

  const product: Product | undefined = data?.product;

  useDocumentTitle(product?.name || 'Product');

  useEffect(() => setQuantity(1), [slug]);

  const shell = 'mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8';

  if (loading) {
    return (
      <div className={shell}>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={shell}>
        <ErrorState
          message={error || 'That product is no longer available.'}
          onRetry={() => void reload()}
        />
        <div className="flex justify-center">
          <Link to="/search" className="text-sm font-bold text-brand-600 hover:text-brand-700">
            Browse everything we have in stock
          </Link>
        </div>
      </div>
    );
  }

  const images: ProductImage[] = product.images?.length
    ? product.images
    : product.primaryImage || product.cardImage
      ? [
          {
            id: 0,
            url: product.primaryImage || product.cardImage || '',
            alt: product.name,
            isPrimary: true,
            sortOrder: 0,
          },
        ]
      : [];

  const reviews = product.reviews || [];
  const related = data?.related || [];
  const maxQuantity = Math.max(1, Math.min(product.stock, 10));
  const wishlisted = wishlistIds.includes(product.id) || Boolean(product.inWishlist);
  const adding = pendingProductId === product.id;
  const onSale = product.discountPercent > 0;

  const stockLabel = !product.inStock
    ? 'Out of stock'
    : product.isLowStock
      ? `Only ${product.stock} left`
      : 'In stock';

  const handleAdd = async () => {
    const result = await dispatch(addToBasket({ productId: product.id, quantity, isAuthenticated }));

    if (addToBasket.fulfilled.match(result)) {
      dispatch(pushToast(result.payload.message, 'success'));
      return true;
    }

    dispatch(pushToast(String(result.payload || 'Could not add to basket'), 'error'));
    return false;
  };

  const handleBuyNow = async () => {
    setBuyingNow(true);
    const added = await handleAdd();
    setBuyingNow(false);
    if (added) navigate('/checkout');
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      dispatch(pushToast('Sign in to save items', 'info'));
      return;
    }

    const result = await dispatch(toggleWishlist(product.id));
    if (toggleWishlist.fulfilled.match(result)) {
      dispatch(pushToast(result.payload.message || 'Wishlist updated', 'success'));
    }
  };

  const details: { label: string; value: string }[] = [
    { label: 'SKU', value: product.sku },
    { label: 'Condition', value: conditionLabel(product.condition) },
    { label: 'Platform', value: product.platform || '—' },
    { label: 'Brand', value: product.brand || '—' },
    { label: 'Warranty', value: warrantyLabel(product.warrantyMonths) || 'Not covered' },
    { label: 'Category', value: product.category?.name || '—' },
  ];

  const trustPoints = [
    ...(warrantyLabel(product.warrantyMonths)
      ? [
          {
            icon: FiShield,
            title: warrantyLabel(product.warrantyMonths)!,
            text: 'Every item is tested before it ships',
          },
        ]
      : []),
    { icon: FiTruck, title: 'Tracked delivery', text: 'Dispatch within 1–2 working days' },
    ...(returnDays > 0
      ? [
          {
            icon: FiRefreshCw,
            title: `${returnDays} day returns`,
            text: 'Change your mind, no fuss',
          },
        ]
      : []),
  ];

  return (
    <div className={shell}>
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs">
        <Link to="/" className="font-medium text-ink-500 transition hover:text-brand-600">
          Home
        </Link>
        <FiChevronRight size={12} className="text-ink-300" />
        {product.category && (
          <>
            <Link
              to={`/category/${product.category.slug}`}
              className="font-medium text-ink-500 transition hover:text-brand-600"
            >
              {product.category.name}
            </Link>
            <FiChevronRight size={12} className="text-ink-300" />
          </>
        )}
        <span className="truncate font-semibold text-ink-800">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Gallery images={images} name={product.name} warrantyMonths={product.warrantyMonths} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {[product.category?.name, product.platform].filter(Boolean).join(' · ') || 'Pre-owned'}
          </p>

          <h1 className="mt-1.5 text-2xl font-black leading-tight text-ink-900 sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StarRating value={product.ratingAverage} count={product.ratingCount} size={15} />
            <Badge tone="neutral">{conditionLabel(product.condition)}</Badge>
            {product.soldCount > 0 && (
              <span className="text-xs text-ink-400">{product.soldCount} sold</span>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-black leading-none text-ink-900">
              {formatPrice(product.effectivePrice)}
            </span>

            {onSale && (
              <>
                <span className="text-base text-ink-400 line-through">
                  {formatPrice(product.price)}
                </span>
                <Badge tone="brand">Save {product.discountPercent}%</Badge>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            <span
              className={cn(
                'font-bold',
                !product.inStock
                  ? 'text-ink-400'
                  : product.isLowStock
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              )}
            >
              {stockLabel}
            </span>

            {warrantyLabel(product.warrantyMonths) && (
              <span className="flex items-center gap-1.5 font-medium text-ink-600">
                <FiShield size={14} className="text-brand-600" />
                {warrantyLabel(product.warrantyMonths)}
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="mt-4 text-sm leading-relaxed text-ink-600">{product.shortDescription}</p>
          )}

          {/* Buying controls */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center rounded-lg border border-ink-200 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1 || !product.inStock}
                aria-label="Decrease quantity"
                className="flex h-full w-10 items-center justify-center text-ink-600 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                <FiMinus size={15} />
              </button>

              <span className="w-10 text-center text-sm font-bold text-ink-900" aria-live="polite">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
                disabled={quantity >= maxQuantity || !product.inStock}
                aria-label="Increase quantity"
                className="flex h-full w-10 items-center justify-center text-ink-600 transition hover:text-brand-600 disabled:cursor-not-allowed disabled:text-ink-300"
              >
                <FiPlus size={15} />
              </button>
            </div>

            <Button
              className="flex-1"
              onClick={handleAdd}
              loading={adding && !buyingNow}
              disabled={!product.inStock}
              leftIcon={<FiShoppingCart size={16} />}
            >
              Add to basket
            </Button>

            <button
              type="button"
              onClick={handleWishlist}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition',
                wishlisted
                  ? 'border-brand-200 bg-brand-50 text-brand-600'
                  : 'border-ink-200 bg-white text-ink-500 hover:text-brand-600'
              )}
            >
              {togglingId === product.id ? (
                <Spinner size="sm" />
              ) : (
                <FiHeart size={17} className={wishlisted ? 'fill-current' : undefined} />
              )}
            </button>
          </div>

          <Button
            variant="dark"
            fullWidth
            className="mt-3"
            onClick={handleBuyNow}
            loading={buyingNow}
            disabled={!product.inStock}
          >
            Buy now
          </Button>

          {/* Trust row */}
          <div className="mt-6 grid gap-3 rounded-[--radius-card] bg-ink-50 p-4 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <div key={point.title} className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-brand-600">
                  <point.icon size={15} />
                </span>
                <span>
                  <span className="block text-xs font-bold text-ink-900">{point.title}</span>
                  <span className="block text-[11px] leading-snug text-ink-500">{point.text}</span>
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <section className="card mt-10 overflow-hidden">
        <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-ink-100 px-2">
          {TABS.map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setTab(entry)}
              aria-current={tab === entry}
              className={cn(
                'shrink-0 border-b-2 px-4 py-3.5 text-sm font-bold transition',
                tab === entry
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              )}
            >
              {TAB_LABELS[entry]}
              {entry === 'reviews' && reviews.length > 0 && ` (${reviews.length})`}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'description' && (
            <div className="whitespace-pre-line text-sm leading-relaxed text-ink-600">
              {product.description || product.shortDescription || 'No description available yet.'}
            </div>
          )}

          {tab === 'details' && (
            <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 border-b border-ink-100 pb-2.5"
                >
                  <dt className="text-sm font-medium text-ink-500">{row.label}</dt>
                  <dd className="text-sm font-semibold text-ink-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === 'reviews' && (
            <div className="space-y-6">
              {product.canReview && (
                <form
                  className="rounded-xl border border-ink-100 bg-ink-50/60 p-4"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setReviewing(true);
                    try {
                      await accountService.createReview({
                        productId: product.id,
                        rating: reviewRating,
                        title: reviewTitle.trim() || undefined,
                        body: reviewBody.trim() || undefined,
                      });
                      dispatch(pushToast('Thanks — your review is live', 'success'));
                      setReviewTitle('');
                      setReviewBody('');
                      setReviewRating(5);
                      await reload();
                    } catch (caught) {
                      dispatch(pushToast(getErrorMessage(caught), 'error'));
                    } finally {
                      setReviewing(false);
                    }
                  }}
                >
                  <h3 className="text-sm font-bold text-ink-900">Write a review</h3>
                  <p className="mt-1 text-xs text-ink-500">
                    You bought this item, so you can tell other shoppers how it was.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={cn(
                          'text-lg',
                          star <= reviewRating ? 'text-amber-400' : 'text-ink-300'
                        )}
                        aria-label={`${star} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 space-y-3">
                    <Input
                      value={reviewTitle}
                      onChange={(event) => setReviewTitle(event.target.value)}
                      label="Title"
                      placeholder="Great condition, as described"
                    />
                    <Textarea
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                      label="Your review"
                      rows={4}
                      placeholder="How did it play? Was the condition accurate?"
                    />
                    <Button type="submit" loading={reviewing} disabled={reviewing}>
                      Post review
                    </Button>
                  </div>
                </form>
              )}

              {!isAuthenticated && (
                <p className="text-sm text-ink-500">
                  <Link to="/login" className="font-bold text-brand-600">
                    Sign in
                  </Link>{' '}
                  after buying this item to leave a review.
                </p>
              )}

              {isAuthenticated && product.hasReviewed && (
                <p className="text-sm text-ink-500">You have already reviewed this item.</p>
              )}

              {isAuthenticated && !product.canReview && !product.hasReviewed && (
                <p className="text-sm text-ink-500">
                  Reviews are only open to customers who have bought this item.
                </p>
              )}

              {reviews.length === 0 ? (
                <EmptyState
                  compact
                  icon={<FiStar size={22} />}
                  title="No reviews yet"
                  message="Be the first to review this item once you have bought it."
                />
              ) : (
                <ul className="space-y-5">
                  {reviews.map((review) => (
                    <li key={review.id} className="border-b border-ink-100 pb-5 last:border-0 last:pb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-ink-900">
                          {[review.user?.firstName, review.user?.lastName].filter(Boolean).join(' ') ||
                            'Verified buyer'}
                        </p>
                        <span className="text-xs text-ink-400">{formatDate(review.createdAt)}</span>
                      </div>

                      <StarRating value={review.rating} size={13} className="mt-1.5" />

                      {review.title && (
                        <p className="mt-2 text-sm font-semibold text-ink-800">{review.title}</p>
                      )}
                      {review.body && (
                        <p className="mt-1 text-sm leading-relaxed text-ink-600">{review.body}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-black tracking-tight text-ink-900 sm:text-xl">
            You might also like
          </h2>

          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:gap-4 lg:mx-0 lg:px-0">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} variant="carousel" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetail;
