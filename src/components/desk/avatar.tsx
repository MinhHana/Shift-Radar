import { useState } from "react";
import { cn } from "@/lib/utils";
import { avatarUrlFor, handleOf } from "@/lib/signals/avatar";
import type { SourceKind } from "@/lib/signals/types";

export function Avatar({
  source,
  author,
  src,
  size = "md",
}: {
  source: SourceKind;
  author: string;
  src?: string;
  size?: "sm" | "md";
}) {
  const url = avatarUrlFor(source, author, src);
  const [failed, setFailed] = useState(false);
  const initials = handleOf(author).slice(0, 2).toUpperCase();
  const box = size === "sm" ? "size-8 text-[10px]" : "size-10 text-[11px]";

  if (failed) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold",
          box,
        )}
        aria-hidden="true"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt=""
      width={size === "sm" ? 32 : 40}
      height={size === "sm" ? 32 : 40}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("shrink-0 rounded-full bg-secondary object-cover", box)}
    />
  );
}
