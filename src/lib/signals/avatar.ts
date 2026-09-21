import type { SourceKind } from "./types";

export function handleOf(author: string) {
  return author.replace(/^@/, "").split("/")[0] || "ai";
}

export function avatarUrlFor(source: SourceKind, author: string, explicit?: string) {
  if (explicit && /^https?:\/\//i.test(explicit)) return explicit;
  const handle = encodeURIComponent(handleOf(author));
  if (source === "github") return `https://github.com/${handle}.png?size=80`;
  return `https://unavatar.io/twitter/${handle}`;
}
