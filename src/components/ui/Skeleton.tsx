import cn from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn('shimmer rounded-lg', className)} aria-hidden="true" />
);

export const ProductCardSkeleton = () => (
  <div className="card overflow-hidden p-3">
    <Skeleton className="aspect-square w-full" />
    <Skeleton className="mt-3 h-3 w-1/3" />
    <Skeleton className="mt-2 h-4 w-full" />
    <Skeleton className="mt-1.5 h-4 w-2/3" />
    <Skeleton className="mt-3 h-6 w-1/2" />
  </div>
);

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {Array.from({ length: count }).map((_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <Skeleton
            key={columnIndex}
            className={cn('h-4', columnIndex === 0 ? 'w-1/3' : 'flex-1')}
          />
        ))}
      </div>
    ))}
  </div>
);

export const StatCardSkeleton = () => (
  <div className="card p-5">
    <Skeleton className="h-3 w-24" />
    <Skeleton className="mt-3 h-7 w-32" />
    <Skeleton className="mt-3 h-3 w-20" />
  </div>
);

export default Skeleton;
