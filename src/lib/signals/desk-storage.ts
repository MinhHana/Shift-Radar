import type { StateStorage } from "zustand/middleware";

const PERSIST_MS = 1000;

export function createDeskStorage(): StateStorage {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingName = "";
  let pendingValue = "";
  let hooked = false;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (!pendingName || typeof localStorage === "undefined") return;
    const name = pendingName;
    const value = pendingValue;
    pendingName = "";
    pendingValue = "";
    try {
      localStorage.setItem(name, value);
    } catch {
      /* quota */
    }
  };

  if (!hooked && typeof window !== "undefined") {
    hooked = true;
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
  }

  return {
    getItem: (name) => (typeof localStorage === "undefined" ? null : localStorage.getItem(name)),
    setItem: (name, value) => {
      pendingName = name;
      pendingValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(flush, PERSIST_MS);
    },
    removeItem: (name) => {
      if (timer) clearTimeout(timer);
      timer = undefined;
      pendingName = "";
      pendingValue = "";
      if (typeof localStorage !== "undefined") localStorage.removeItem(name);
    },
  };
}
