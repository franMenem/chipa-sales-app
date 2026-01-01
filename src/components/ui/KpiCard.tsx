import { Card } from './Card';

interface KpiCardProps {
  label: string;
  value: string;
  icon: string;
  iconColor?: 'primary' | 'blue' | 'green' | 'red' | 'orange';
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down';
  };
  className?: string;
}

const iconColorClasses = {
  primary: 'bg-primary/10 text-primary',
  blue: 'bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400',
  green: 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-400',
  red: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
  orange: 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400',
};

export function KpiCard({
  label,
  value,
  icon,
  iconColor = 'primary',
  trend,
  className = '',
}: KpiCardProps) {
  return (
    <Card className={`min-w-[200px] ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-1">{label}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {value}
          </p>
          {trend && (
            <div className="flex items-center gap-1">
              <span
                className={`material-symbols-outlined text-[16px] ${
                  trend.direction === 'up'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
              </span>
              <span
                className={`text-xs font-medium ${
                  trend.direction === 'up'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.value}%
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-full ${iconColorClasses[iconColor]}`}
        >
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
      </div>
    </Card>
  );
}
