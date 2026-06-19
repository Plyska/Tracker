import { cn } from "@/shared/lib";

/**
 * Скелетон однієї клітинки сітки — акцентно-тонований shimmer (конвенція skeleton-first).
 * Показується замість `CheckboxCell` під час завантаження відміток періоду (рядки навичок
 * лишаються стабільними). Повноцінний реюзабельний `Skeleton`-примітив — Фаза 10.
 */
export function SkeletonCell() {
  return (
    <div className="flex items-center justify-center p-1.5">
      <span className="h-8 w-8 animate-pulse rounded-md bg-accent/50" />
    </div>
  );
}

/** Плейсхолдер усієї таблиці на першому завантаженні (навички ще не прийшли). */
export function TableSkeleton({ rows = 5, cols = 7 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `minmax(160px,1.6fr) repeat(${cols}, minmax(46px,1fr))`,
        }}
      >
        {/* Шапка */}
        <div className="border-b border-border bg-muted px-4 py-3" />
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center border-b border-l border-border bg-muted py-2"
          >
            <span className="h-6 w-6 animate-pulse rounded-full bg-muted-foreground/20" />
          </div>
        ))}
        {/* Рядки */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="contents">
            <div className="flex items-center gap-2.5 border-b border-border bg-card px-4 py-2">
              <span className="h-7 w-7 animate-pulse rounded-full bg-accent/40" />
              <span
                className={cn(
                  "h-3.5 animate-pulse rounded bg-muted-foreground/20",
                  r % 2 ? "w-24" : "w-32",
                )}
              />
            </div>
            {Array.from({ length: cols }).map((_, c) => (
              <div
                key={c}
                className="flex items-center justify-center border-b border-l border-border"
              >
                <SkeletonCell />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
