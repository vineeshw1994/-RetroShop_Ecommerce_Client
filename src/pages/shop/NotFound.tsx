import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowRight, FiHome, FiSearch } from 'react-icons/fi';
import { useDocumentTitle } from '@/hooks';
import { Button, Input } from '@/components/ui';

const NotFound = () => {
  useDocumentTitle('Page not found');

  const navigate = useNavigate();
  const [term, setTerm] = useState('');

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center lg:px-6 lg:py-24">
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="text-7xl font-black leading-none text-brand-600 sm:text-8xl"
      >
        404
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="mt-4 text-2xl font-black tracking-tight text-ink-900 sm:text-3xl">
          This page has been traded in
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          We could not find what you were after. It may have sold out, moved, or the link might have
          a typo. Try a search instead.
        </p>

        <form
          className="mx-auto mt-7 flex w-full max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = term.trim();
            navigate(trimmed ? `/search?search=${encodeURIComponent(trimmed)}` : '/search');
          }}
          role="search"
        >
          <Input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search games, consoles and tech"
            aria-label="Search products"
            leftIcon={<FiSearch size={16} />}
          />
          <Button type="submit" className="shrink-0">
            Search
          </Button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button variant="outline" leftIcon={<FiHome size={15} />}>
              Back to home
            </Button>
          </Link>
          <Link to="/search">
            <Button variant="dark" rightIcon={<FiArrowRight size={15} />}>
              Browse everything
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
