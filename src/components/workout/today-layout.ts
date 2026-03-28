export const todayLayout = {
  screen:
    "w-full max-w-[430px] mx-auto min-h-screen bg-neutral-950 text-neutral-50 px-3 pt-3 pb-[max(112px,calc(112px+env(safe-area-inset-bottom)))]",
  sectionStack: "space-y-2.5",
  card: "rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1.5",
  rowTransition: "transition-colors duration-75",
  actionPress: "active:bg-neutral-800/60",
} as const;

export const setTableLayout = {
  gridWithPrevious: "grid-cols-[42px_1fr_92px_60px_48px]",
} as const;
