import type { InputHTMLAttributes } from 'react';

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

export function SearchBar({ value, onClear, className = '', ...props }: SearchBarProps) {
  const hasValue = value && value.toString().length > 0;

  return (
    <div className="relative w-full">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
        search
      </span>
      <input
        type="text"
        value={value}
        className={`
          w-full pl-10 pr-10 py-2.5 rounded-xl
          bg-white dark:bg-surface-dark
          border border-slate-200 dark:border-slate-700
          text-slate-900 dark:text-white
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          transition-all duration-200
          ${className}
        `}
        {...props}
      />
      {hasValue && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <span className="material-symbols-outlined text-slate-400 text-[18px]">
            close
          </span>
        </button>
      )}
    </div>
  );
}
