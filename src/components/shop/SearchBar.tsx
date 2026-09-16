import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiX, FiClock, FiTrendingUp } from 'react-icons/fi';
import { shopService } from '@/services/shop.service';
import { useClickOutside, useDebounce } from '@/hooks';
import { recentSearches } from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { SmartImage, Spinner } from '@/components/ui';
import cn from '@/lib/cn';

interface Suggestion {
  products: { id: number; name: string; slug: string; price: number; primaryImage: string | null }[];
  categories: { id: number; name: string; slug: string }[];
}

const SearchBar = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Suggestion>({ products: [], categories: [] });
  const [history, setHistory] = useState<string[]>(() => recentSearches.read());

  const debounced = useDebounce(term, 280);
  const containerRef = useClickOutside<HTMLDivElement>(() => setOpen(false));

  useEffect(() => {
    if (debounced.trim().length < 2) {
      setResults({ products: [], categories: [] });
      return;
    }

    let cancelled = false;
    setLoading(true);

    shopService
      .getSuggestions(debounced)
      .then((response) => {
        if (!cancelled) setResults(response.data);
      })
      .catch(() => {
        if (!cancelled) setResults({ products: [], categories: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const runSearch = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    recentSearches.push(trimmed);
    setHistory(recentSearches.read());
    setOpen(false);
    navigate(`/search?search=${encodeURIComponent(trimmed)}`);
  };

  const hasSuggestions = results.products.length > 0 || results.categories.length > 0;
  const showHistory = term.trim().length < 2 && history.length > 0;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(term);
        }}
        role="search"
      >
        <div className="relative">
          <input
            type="search"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="What do you want to buy?"
            aria-label="Search products"
            className="h-11 w-full rounded-lg border-0 bg-white pl-4 pr-11 text-sm text-ink-800 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-900/10"
          />

          {term && (
            <button
              type="button"
              onClick={() => {
                setTerm('');
                setResults({ products: [], categories: [] });
              }}
              aria-label="Clear search"
              className="absolute right-10 top-1/2 -translate-y-1/2 rounded p-1 text-ink-400 hover:text-ink-700"
            >
              <FiX size={15} />
            </button>
          )}

          <button
            type="submit"
            aria-label="Search"
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
          >
            {loading ? <Spinner size="xs" /> : <FiSearch size={17} />}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {open && (hasSuggestions || showHistory) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-ink-100 bg-white shadow-lift"
          >
            {showHistory && (
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">
                    Recent searches
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      recentSearches.clear();
                      setHistory([]);
                    }}
                    className="text-[11px] font-medium text-ink-400 hover:text-brand-600"
                  >
                    Clear
                  </button>
                </div>
                {history.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => runSearch(entry)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-700 transition hover:bg-ink-50"
                  >
                    <FiClock size={14} className="text-ink-400" />
                    {entry}
                  </button>
                ))}
              </div>
            )}

            {results.categories.length > 0 && (
              <div className="border-t border-ink-100 p-2 first:border-t-0">
                <span className="block px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  Categories
                </span>
                {results.categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/category/${category.slug}`);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink-700 transition hover:bg-ink-50"
                  >
                    <FiTrendingUp size={14} className="text-ink-400" />
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            {results.products.length > 0 && (
              <div className="border-t border-ink-100 p-2 first:border-t-0">
                <span className="block px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
                  Products
                </span>
                {results.products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(`/product/${product.slug}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-ink-50"
                  >
                    <SmartImage
                      src={product.primaryImage}
                      alt={product.name}
                      wrapperClassName="h-10 w-10 shrink-0 rounded-md"
                      className="h-full w-full object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink-800">
                        {product.name}
                      </span>
                      <span className="block text-xs font-bold text-brand-600">
                        {formatPrice(product.price)}
                      </span>
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => runSearch(term)}
                  className="mt-1 w-full rounded-lg bg-ink-50 py-2 text-center text-xs font-bold text-brand-600 transition hover:bg-ink-100"
                >
                  See all results for “{term.trim()}”
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;
