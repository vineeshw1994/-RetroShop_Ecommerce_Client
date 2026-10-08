import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ROTATING_MESSAGES } from '@/lib/shopNav';

const INTERVAL_MS = 4200;

const PromoTicker = () => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || ROTATING_MESSAGES.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_MESSAGES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused]);

  const message = ROTATING_MESSAGES[index];
  if (!message) return null;

  return (
    <div
      className="border-b border-brand-500/20 bg-void"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link
        to={message.to}
        className="mx-auto flex h-9 max-w-7xl items-center justify-center px-3 text-center sm:h-10"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={message.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="truncate text-[12px] font-semibold tracking-wide text-brand-400 sm:text-sm"
          >
            {message.text}
          </motion.span>
        </AnimatePresence>
      </Link>
    </div>
  );
};

export default PromoTicker;
