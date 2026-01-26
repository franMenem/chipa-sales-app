interface RecipeModeTabsProps {
  useCategoriasMode: boolean;
  onChange: (mode: boolean) => void;
}

export function RecipeModeTabs({ useCategoriasMode, onChange }: RecipeModeTabsProps) {
  return (
    <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
          !useCategoriasMode
            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        Ingredientes Específicos
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
          useCategoriasMode
            ? 'bg-white dark:bg-slate-700 text-primary shadow-sm'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        Por Categorías
      </button>
    </div>
  );
}
