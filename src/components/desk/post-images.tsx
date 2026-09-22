import { cn } from "@/lib/utils";

export function PostImages({
  urls,
  large,
}: {
  urls?: string[];
  large?: boolean;
}) {
  const pics = (urls ?? []).filter(Boolean).slice(0, 4);
  if (!pics.length) return null;
  const many = pics.length > 1;

  return (
    <div
      className={cn(
        "mt-2 overflow-hidden rounded-2xl border border-border bg-secondary",
        many && "grid grid-cols-2 gap-px",
      )}
    >
      {pics.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
          draggable={false}
          className={cn(
            "w-full object-cover",
            many ? (large ? "h-36" : "h-28") : large ? "max-h-80" : "max-h-52",
          )}
        />
      ))}
    </div>
  );
}
