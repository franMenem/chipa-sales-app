interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${variantClasses[variant]} ${className}`}
      aria-label="Loading..."
      role="status"
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
