interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  disabled = false,
}: QuantityStepperProps) {
  const handleDecrement = () => {
    const newValue = value - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = value + step;
    if (newValue <= max) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    } else if (e.target.value === '') {
      onChange(0);
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
        aria-label="Decrementar"
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[18px]">remove</span>
      </button>

      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        className="w-16 sm:w-20 px-2 sm:px-3 py-2 sm:py-1.5 text-center text-base rounded-lg bg-white dark:bg-surface-dark border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className="flex items-center justify-center w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-manipulation"
        aria-label="Incrementar"
      >
        <span className="material-symbols-outlined text-[20px] sm:text-[18px]">add</span>
      </button>
    </div>
  );
}
