import { memo, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiShoppingCart, FiMinus, FiPlus, FiShield, FiCheckCircle, FiTruck } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToBasket, removeBasketLine, updateBasketLine } from '@/store/slices/basketSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { formatPrice } from '@/lib/format';
import cn from '@/lib/cn';
import { SmartImage, StarRating, Spinner } from '@/components/ui';
import GradeBadge from '@/components/shop/GradeBadge';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'grid' | 'carousel';
  eager?: boolean;
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
  const isNew = Date.now() - new Date(product.createdAt).getTime() < 21 * 24 * 60 * 60 * 1000;
  const isBest = product.isFeatured && product.soldCount >= 3;

  const handleAdd = async (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
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

  const handleWishlist = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
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

  const motionProps =
    variant === 'carousel'
      ? {}
      : {
          initial: { opacity: 0, y: 12 } as const,
          whileInView: { opacity: 1, y: 0 } as const,
          viewport: { once: true, margin: '-40px' } as const,
        };

  return (
    <motion.article
      {...motionProps}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-ink-100',
        'shadow-card transition-shadow hover:border-brand-500/40 hover:shadow-lift',
        variant === 'carousel' && 'w-[220px] shrink-0 xl:w-[240px]'
      )}
    >
      <div className="relative">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          <SmartImage
            src={product.cardImage || product.primaryImage}
            alt={product.name}
            eager={eager}
            wrapperClassName="aspect-square w-full bg-ink-50"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          />
        </Link>

        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {isNew && (
            <span className="rounded-md bg-brand-600 px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-void">
              New arrival
            </span>
          )}
          {isBest && !onSale && (
            <span className="rounded-md bg-accent-600 px-1.5 py-1 text-[9px] font-black uppercase tracking-wide text-white">
              Best seller
            </span>
          )}
        </div>

        {onSale && (
          <span className="absolute right-10 top-2 rounded-md bg-rose-500 px-1.5 py-1 text-[10px] font-bold text-white">
            -{product.discountPercent}%
          </span>
        )}

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
          className={cn(
            'absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-void/80 shadow-sm ring-1 ring-brand-500/30 transition',
            wishlisted ? 'text-accent-400' : 'text-ink-400 hover:text-brand-400'
          )}
        >
          {togglingWishlist ? (
            <Spinner size="xs" />
          ) : (
            <FiHeart size={15} className={wishlisted ? 'fill-current' : undefined} />
          )}
        </button>

        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-50/80">
            <span className="rounded-full bg-void px-3 py-1.5 text-xs font-bold text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <Link
          to={`/product/${product.slug}`}
          className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-snug text-ink-900 transition hover:text-brand-400"
        >
          {product.name}
        </Link>
        <p className="mt-0.5 text-[11px] text-ink-400">(Pre-owned)</p>

        <div className="mt-1.5">
          <GradeBadge condition={product.condition} />
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-2">
          <p className="text-lg font-black leading-none text-brand-400">
            {formatPrice(product.effectivePrice)}
          </p>
          {onSale && (
            <p className="text-xs text-ink-400 line-through">{formatPrice(product.price)}</p>
          )}
        </div>

        <div className="mt-1.5 min-h-[18px]">
          {product.ratingCount > 0 && (
            <StarRating value={product.ratingAverage} count={product.ratingCount} size={12} />
          )}
        </div>

        <ul className="mt-2 space-y-0.5 text-[10px] font-medium text-ink-500">
          <li className="flex items-center gap-1.5">
            <FiShield size={11} className="text-brand-400" /> 12 Month Warranty
          </li>
          <li className="flex items-center gap-1.5">
            <FiCheckCircle size={11} className="text-brand-400" /> Fully Tested &amp; Cleaned
          </li>
          <li className="flex items-center gap-1.5">
            <FiTruck size={11} className="text-brand-400" /> Free Delivery
          </li>
        </ul>

        <div className="mt-auto pt-3">
          {inBasket ? (
            <div
              className="flex h-10 items-center overflow-hidden rounded-xl bg-brand-600 text-void"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={(event) => void handleDecrease(event)}
                disabled={adding}
                aria-label={`Remove one ${product.name} from basket`}
                className="flex h-full w-10 items-center justify-center transition hover:bg-brand-500 disabled:opacity-60"
              >
                <FiMinus size={14} />
              </button>
              <span className="flex-1 text-center text-sm font-bold" aria-live="polite">
                {adding ? '…' : basketQuantity}
              </span>
              <button
                type="button"
                onClick={(event) => void handleIncrease(event)}
                disabled={adding || !product.inStock || basketQuantity >= Math.min(product.stock, 10)}
                aria-label={`Add one more ${product.name}`}
                className="flex h-full w-10 items-center justify-center transition hover:bg-brand-500 disabled:opacity-60"
              >
                <FiPlus size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => void handleAdd(event)}
              disabled={!product.inStock || adding}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-void transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-ink-300 disabled:text-ink-500"
            >
              {adding ? <Spinner size="xs" /> : <FiShoppingCart size={15} />}
              Add to Basket
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};

export default memo(ProductCard);
