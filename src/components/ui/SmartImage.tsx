import { useState } from 'react';
import { FiImage } from 'react-icons/fi';
import cn from '@/lib/cn';
import { assetUrl } from '@/lib/format';

interface SmartImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  /** Skip the fade-in for above-the-fold artwork. */
  eager?: boolean;
}

/**
 * Image that resolves `/uploads/...` paths, fades in once decoded, and falls
 * back to a neutral tile when the file is missing.
 */
const SmartImage = ({ src, alt, className, wrapperClassName, eager }: SmartImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const resolved = assetUrl(src);

  if (!resolved || failed) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center bg-ink-100 text-ink-300',
        wrapperClassName,
        className
      )}
      aria-label={alt}
    >
        <FiImage size={28} />
      </div>
    );
  }

  return (
    <div className={cn('relative shrink-0 overflow-hidden bg-ink-50', wrapperClassName)}>
      {!loaded && <div className="shimmer absolute inset-0" />}
      <img
        src={resolved}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </div>
  );
};

export default SmartImage;
