import { createServerFn } from "@tanstack/react-start";
import type { ScanError, ScanResult } from "./types";

export const runScan = createServerFn({ method: "POST" })
  .validator((data: { typesafeKey: string; focus?: string }) => {
    if (!data || typeof data.typesafeKey !== "string") {
      throw new Error("TypeSafe API key required.");
    }
    return {
      typesafeKey: data.typesafeKey.trim(),
      focus: typeof data.focus === "string" ? data.focus.trim() : "",
    };
  })
  .handler(async ({ data }): Promise<ScanResult | ScanError> => {
    const { executeScan } = await import("./scan-impl.server.ts");
    return executeScan({
      typesafeKey: data.typesafeKey,
      focus: data.focus || undefined,
    });
  });

export const checkTypeSafeKey = createServerFn({ method: "POST" })
  .validator((data: { typesafeKey: string }) => {
    if (!data || typeof data.typesafeKey !== "string") {
      throw new Error("TypeSafe API key required.");
    }
    return { typesafeKey: data.typesafeKey.trim() };
  })
  .handler(async ({ data }) => {
    const { probeTypeSafe } = await import("./typesafe.server.ts");
    return probeTypeSafe(data.typesafeKey);
  });
