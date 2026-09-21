import { cn } from "@/lib/utils";

export function JevLogo({
  scoring,
  size = "md",
}: {
  scoring?: boolean;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "size-6" : "size-8";
  return (
    <span
      className={cn(
        "jev-logo relative inline-flex shrink-0 items-center justify-center",
        box,
        scoring && "is-scoring",
      )}
      aria-hidden="true"
    >
      {scoring ? <span className="jev-ripple" /> : null}
      {scoring ? <span className="jev-ripple" /> : null}
      {scoring ? <span className="jev-ripple" /> : null}
      <img src="/jev.png" alt="" width={size === "sm" ? 24 : 32} height={size === "sm" ? 24 : 32} />
    </span>
  );
}
