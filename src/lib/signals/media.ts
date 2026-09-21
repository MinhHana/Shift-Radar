const IMAGE_RE =
  /https:\/\/(?:pbs\.twimg\.com\/[^"'\\\s]+|(?:video|ton)\.twimg\.com\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp)|opengraph\.githubassets\.com\/[^"'\\\s]+|raw\.githubusercontent\.com\/[^"'\\\s]+\.(?:png|jpe?g|gif|webp)|user-images\.githubusercontent\.com\/[^"'\\\s]+|github\.com\/[^"'\\\s]+\/assets\/[^"'\\\s]+)/gi;

export function cleanImageUrl(raw: string): string | null {
  let u = raw.replace(/\\u0026/g, "&").replace(/\\+/g, "").replace(/[),.;]+$/, "");
  try {
    u = decodeURIComponent(u);
  } catch {
    /* keep */
  }
  if (!/^https:\/\//i.test(u)) return null;
  if (/profile_images|emoji|avatar/i.test(u)) return null;
  if (u.includes("pbs.twimg.com")) {
    u = u.replace(/name=\w+/i, "name=small");
    if (!/[?&]name=/.test(u) && /\/media\//.test(u)) {
      u += (u.includes("?") ? "&" : "?") + "name=small";
    }
  }
  return u;
}

export function harvestImageUrls(...blobs: unknown[]): string[] {
  const found = new Set<string>();
  for (const blob of blobs) {
    if (!blob) continue;
    if (Array.isArray(blob)) {
      for (const item of blob) {
        if (typeof item === "string") {
          const c = cleanImageUrl(item);
          if (c) found.add(c);
        } else {
          for (const u of harvestImageUrls(item)) found.add(u);
        }
      }
      continue;
    }
    const text = typeof blob === "string" ? blob : JSON.stringify(blob);
    for (const m of text.matchAll(IMAGE_RE)) {
      const c = cleanImageUrl(m[0]);
      if (c) found.add(c);
    }
  }
  return [...found].slice(0, 4);
}

export function imagesFromRow(r: Record<string, unknown>): string[] {
  const bag: unknown[] = [
    r.image_urls,
    r.images,
    r.media,
    r.photos,
    r.image_url,
    r.media_url,
    r.preview_image_url,
  ];
  return harvestImageUrls(...bag);
}

export function readmeImages(md: string): string[] {
  const urls: string[] = [];
  for (const m of md.matchAll(/!\[[^\]]*]\((https?:\/\/[^)\s]+)\)/g)) urls.push(m[1]);
  for (const m of md.matchAll(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi)) urls.push(m[1]);
  return harvestImageUrls(urls);
}
