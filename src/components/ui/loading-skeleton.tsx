import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animated?: boolean;
}

export function Skeleton({ 
  className, 
  width, 
  height, 
  rounded = 'md',
  animated = true 
}: SkeletonProps) {
  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };

  return (
    <div
      className={cn(
        'bg-muted',
        roundedClasses[rounded],
        animated && 'animate-pulse',
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
  lines?: number;
  showAvatar?: boolean;
  showImage?: boolean;
}

export function SkeletonCard({ 
  className, 
  lines = 3, 
  showAvatar = false,
  showImage = false 
}: SkeletonCardProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {showImage && (
        <Skeleton className="w-full h-48" />
      )}
      
      <div className="space-y-2">
        {showAvatar && (
          <div className="flex items-center space-x-2">
            <Skeleton className="w-10 h-10" rounded="full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        )}
        
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn(
              'h-4',
              i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/2' : 'w-full'
            )} 
          />
        ))}
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  className 
}: SkeletonTableProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-4 flex-1" 
              width={colIndex === 0 ? '60%' : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonGridProps {
  items?: number;
  columns?: number;
  className?: string;
  itemHeight?: string | number;
}

export function SkeletonGrid({ 
  items = 6, 
  columns = 3, 
  className,
  itemHeight = 200 
}: SkeletonGridProps) {
  return (
    <div 
      className={cn(
        'grid gap-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="w-full" 
          height={itemHeight}
        />
      ))}
    </div>
  );
}

// Componente de loading para páginas inteiras
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      
      <SkeletonGrid items={6} columns={3} />
    </div>
  );
}

// Componente de loading para formulários
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-32 w-full" />
      </div>
      
      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
