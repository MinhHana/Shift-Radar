export function EmptyRadar({ hasKey, tabEmpty }: { hasKey: boolean; tabEmpty?: boolean }) {
  return (
    <p className="px-4 py-6 text-sm leading-relaxed text-muted-foreground">
      {tabEmpty
        ? "No posts in this tab yet. All still has the briefing — Scan again if Voices/Founders timed out."
        : hasKey
          ? "Scan pulls AI news from X and GitHub — shipping updates and quiet high-impact, so you do not have to scroll."
          : "Settings → paste a TypeSafe key, then Scan. This desk is the briefing you would miss on X and GitHub."}
    </p>
  );
}
