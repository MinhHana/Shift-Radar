export function EmptyRadar({ hasKey }: { hasKey: boolean }) {
  return (
    <div className="px-6 py-20">
      <h2 className="font-display text-4xl font-medium tracking-tight">No signals yet.</h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {hasKey
          ? "Write a focus, then Scan. Jev keeps what matters — even when almost nobody is talking."
          : "Settings → paste a TypeSafe key, then Scan like posting."}
      </p>
    </div>
  );
}
