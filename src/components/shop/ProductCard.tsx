import { memo, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiShoppingCart, FiMinus, FiPlus } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToBasket, removeBasketLine, updateBasketLine } from '@/store/slices/basketSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { formatPrice, conditionLabel } from '@/lib/format';
import cn from '@/lib/cn';
import { SmartImage, StarRating, Spinner } from '@/components/ui';
import WarrantyRoundel from '@/components/shop/WarrantyRoundel';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  /** Compact layout for carousels; roomier for grid pages. */
  variant?: 'grid' | 'carousel';
  eager?: boolean;
  /** Called after a successful wishlist toggle (e.g. to sync account wishlist page). */
  onWishlistChange?: (productId: number, inWishlist: boolean) => void;
}

const ProductCard = ({
  product,
  variant = 'grid',
  eager = false,
  onWishlistChange,
}: ProductCardProps) => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');
  const pendingProductId = useAppSelector((state) => state.basket.pendingProductId);
  const basketLine = useAppSelector((state) =>
    state.basket.lines.find((line) => line.productId === product.id)
  );
  const inBasket = Boolean(basketLine);
  const basketQuantity = basketLine?.quantity ?? 0;
  const wishlisted = useAppSelector((state) => state.wishlist.productIds.includes(product.id));
  const togglingWishlist = useAppSelector((state) => state.wishlist.togglingId === product.id);

  const adding = pendingProductId === product.id;
  const onSale = product.discountPercent > 0;

  const handleAdd = async () => {
    const result = await dispatch(addToBasket({ productId: product.id, isAuthenticated }));

    if (addToBasket.fulfilled.match(result)) {
      dispatch(pushToast(result.payload.message, 'success'));
    } else {
      dispatch(pushToast(String(result.payload || 'Could not add to basket'), 'error'));
    }
  };

  const handleIncrease = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!basketLine || !product.inStock) return;

    const maxQuantity = Math.min(product.stock, 10);
    if (basketQuantity >= maxQuantity) {
      dispatch(pushToast(`Only ${maxQuantity} available`, 'warning'));
      return;
    }

    const result = await dispatch(
      updateBasketLine({
        lineId: basketLine.id,
        productId: product.id,
        quantity: basketQuantity + 1,
        isAuthenticated,
      })
    );

    if (updateBasketLine.rejected.match(result)) {
      dispatch(pushToast(String(result.payload || 'Could not update basket'), 'error'));
    }
  };

  const handleDecrease = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!basketLine) return;

    if (basketQuantity <= 1) {
      const result = await dispatch(
        removeBasketLine({
          lineId: basketLine.id,
          productId: product.id,
          isAuthenticated,
        })
      );

      if (removeBasketLine.fulfilled.match(result)) {
        dispatch(pushToast('Removed from basket', 'info'));
      } else {
        dispatch(pushToast(String(result.payload || 'Could not update basket'), 'error'));
      }
      return;
    }

    const result = await dispatch(
      updateBasketLine({
        lineId: basketLine.id,
        productId: product.id,
        quantity: basketQuantity - 1,
        isAuthenticated,
      })
    );

    if (updateBasketLine.rejected.match(result)) {
      dispatch(pushToast(String(result.payload || 'Could not update basket'), 'error'));
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      dispatch(pushToast('Sign in to save items to your wishlist', 'info'));
      return;
    }

    const result = await dispatch(toggleWishlist(product.id));
    if (toggleWishlist.fulfilled.match(result)) {
      onWishlistChange?.(product.id, result.payload.inWishlist);
      dispatch(pushToast(result.payload.message || 'Wishlist updated', 'success'));
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-[--radius-card] border border-ink-100 bg-white',
        'shadow-card transition-shadow hover:shadow-lift',
        variant === 'carousel' && 'w-[220px] shrink-0 xl:w-[240px]'
      )}
    >
      <div className="relative">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          <SmartImage
            src={product.cardImage || product.primaryImage}
            alt={product.name}
            eager={eager}
            wrapperClassName="aspect-square w-full bg-white"
            className="object-contain p-2 transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <WarrantyRoundel months={product.warrantyMonths} />

        {onSale && (
          <span className="absolute right-2 top-2 rounded-md bg-ink-900 px-1.5 py-1 text-[10px] font-bold text-white">
            -{product.discountPercent}%
          </span>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={cn(
            'absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-ink-100 transition',
            wishlisted ? 'text-brand-600' : 'text-ink-400 hover:text-brand-600'
          )}
        >
          {togglingWishlist ? (
            <Spinner size="xs" />
          ) : (
            <FiHeart size={15} className={wishlisted ? 'fill-current' : undefined} />
          )}
        </button>

        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
            <span className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <p className="truncate text-[11px] font-medium text-ink-400">
          {product.category?.name || product.platform || conditionLabel(product.condition)}
        </p>

        <Link
          to={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink-800 transition hover:text-brand-600"
        >
          {product.name}
        </Link>

        <div className="mt-1.5 min-h-[18px]">
          {product.ratingCount > 0 && (
            <StarRating value={product.ratingAverage} size={12} showValue />
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-base font-extrabold leading-none text-ink-900">
              {formatPrice(product.effectivePrice)}
            </p>
            {onSale && (
              <p className="mt-1 text-xs text-ink-400 line-through">{formatPrice(product.price)}</p>
            )}
          </div>

          {inBasket ? (
            <div
              className="flex h-9 shrink-0 items-center overflow-hidden rounded-full bg-emerald-600 text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={(event) => void handleDecrease(event)}
                disabled={adding}
                aria-label={`Remove one ${product.name} from basket`}
                className="flex h-full w-8 items-center justify-center transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <FiMinus size={14} />
              </button>
              <span className="min-w-[1.25rem] text-center text-sm font-bold" aria-live="polite">
                {adding ? '…' : basketQuantity}
              </span>
              <button
                type="button"
                onClick={(event) => void handleIncrease(event)}
                disabled={adding || !product.inStock || basketQuantity >= Math.min(product.stock, 10)}
                aria-label={`Add one more ${product.name}`}
                className="flex h-full w-8 items-center justify-center transition hover:bg-emerald-700 disabled:opacity-60"
              >
                <FiPlus size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.inStock || adding}
              aria-label={`Add ${product.name} to basket`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              {adding ? <Spinner size="xs" /> : <FiShoppingCart size={15} />}
            </button>
          )}
        </div>

        <div className="mt-2 min-h-[16px]">
          {product.isLowStock && product.inStock && (
            <p className="text-[11px] font-semibold text-amber-600">
              Only {product.stock} left
            </p>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export default memo(ProductCard);
