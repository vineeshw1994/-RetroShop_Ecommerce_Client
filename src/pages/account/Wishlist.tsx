import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiClock, FiHeart, FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '@/store';
import { addToBasket } from '@/store/slices/basketSlice';
import { toggleWishlist } from '@/store/slices/wishlistSlice';
import { pushToast } from '@/store/slices/uiSlice';
import { accountService } from '@/services/account.service';
import { useAsync, useDocumentTitle, useQueryFilters } from '@/hooks';
import { formatRelative } from '@/lib/format';
import ProductCard from '@/components/shop/ProductCard';
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  ProductGridSkeleton,
  Spinner,
} from '@/components/ui';
import type { PageMeta, WishlistEntry } from '@/types';

const DEFAULTS = { page: '1' };

type WishlistPage = { data: WishlistEntry[]; meta?: PageMeta };

const PAGE_SIZE = 12;

const Wishlist = () => {
  useDocumentTitle('My wishlist');

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.status === 'authenticated');

  const { filters, setFilter } = useQueryFilters(DEFAULTS);
  const page = Number(filters.page) || 1;

  const { data, loading, error, reload, setData } = useAsync<WishlistPage>(
    () => accountService.listWishlist({ page, limit: PAGE_SIZE }),
    [page]
  );

  const [removingId, setRemovingId] = useState<number | null>(null);
  const [movingAll, setMovingAll] = useState(false);

  const entries = data?.data || [];
  const meta = data?.meta;
  const inStock = entries.filter((entry) => entry.product.inStock);

  const removeEntryFromList = (productId: number) => {
    setData((prev) => {
      if (!prev) return prev;

      const nextEntries = prev.data.filter((entry) => entry.product.id !== productId);
      if (nextEntries.length === prev.data.length) return prev;

      return {
        ...prev,
        data: nextEntries,
        meta: prev.meta
          ? { ...prev.meta, total: Math.max(0, (prev.meta.total || 0) - 1) }
          : prev.meta,
      };
    });
  };

  const handleRemove = async (productId: number) => {
    setRemovingId(productId);
    const result = await dispatch(toggleWishlist(productId));
    setRemovingId(null);

    if (toggleWishlist.fulfilled.match(result)) {
      removeEntryFromList(productId);
      dispatch(pushToast(result.payload.message || 'Removed from your wishlist', 'success'));
    } else {
      dispatch(pushToast(String(result.payload || 'Could not update your wishlist'), 'error'));
    }
  };

  const handleMoveAll = async () => {
    if (inStock.length === 0) return;

    setMovingAll(true);
    let added = 0;

    // Sequential so the server basket applies each line against fresh stock.
    for (const entry of inStock) {
      const result = await dispatch(
        addToBasket({ productId: entry.product.id, isAuthenticated })
      );
      if (addToBasket.fulfilled.match(result)) added += 1;
    }

    setMovingAll(false);
    dispatch(
      added > 0
        ? pushToast(
            `Added ${added} of ${inStock.length} ${inStock.length === 1 ? 'item' : 'items'} to your basket`,
            'success'
          )
        : pushToast('We could not add those items to your basket', 'error')
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight text-ink-900 sm:text-2xl">
            My wishlist
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {meta?.total
              ? `${meta.total} saved ${meta.total === 1 ? 'game' : 'games'} — grab them before someone else does.`
              : 'Games and consoles you have saved for later.'}
          </p>
        </div>

        {inStock.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            loading={movingAll}
            onClick={handleMoveAll}
            leftIcon={<FiShoppingBag size={14} />}
          >
            Move all in-stock to basket
          </Button>
        )}
      </header>

      {loading && <ProductGridSkeleton count={8} />}

      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && entries.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<FiHeart size={22} />}
            title="Your wishlist is empty"
            message="Tap the heart on any product to keep an eye on it and get it later."
            action={{ label: 'Browse products', onClick: () => navigate('/search') }}
          />
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {entries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(index, 8) * 0.03 }}
                className="flex flex-col gap-2"
              >
                <ProductCard
                  product={entry.product}
                  onWishlistChange={(id, inWishlist) => {
                    if (!inWishlist) removeEntryFromList(id);
                  }}
                />

                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="flex min-w-0 items-center gap-1 text-[11px] text-ink-400">
                    <FiClock size={11} className="shrink-0" />
                    <span className="truncate">Saved {formatRelative(entry.addedAt)}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => handleRemove(entry.product.id)}
                    disabled={removingId === entry.product.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold text-ink-500 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-50"
                  >
                    {removingId === entry.product.id ? (
                      <Spinner size="xs" />
                    ) : (
                      <FiTrash2 size={11} />
                    )}
                    Remove
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          <Pagination meta={meta} onPageChange={(next) => setFilter({ page: next })} />
        </>
      )}
    </div>
  );
};

export default Wishlist;
