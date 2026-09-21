/** iOS still pinches even with user-scalable=no. Kill multi-touch zoom. */
export function lockZoom(target: Document | HTMLElement = document) {
  const stop = (e: Event) => {
    e.preventDefault();
  };
  const stopPinch = (e: TouchEvent) => {
    if (e.touches.length > 1) e.preventDefault();
    const scale = (e as TouchEvent & { scale?: number }).scale;
    if (typeof scale === "number" && scale !== 1) e.preventDefault();
  };

  target.addEventListener("gesturestart", stop, { passive: false });
  target.addEventListener("gesturechange", stop, { passive: false });
  target.addEventListener("gestureend", stop, { passive: false });
  target.addEventListener("touchmove", stopPinch as EventListener, { passive: false });
  return () => {
    target.removeEventListener("gesturestart", stop);
    target.removeEventListener("gesturechange", stop);
    target.removeEventListener("gestureend", stop);
    target.removeEventListener("touchmove", stopPinch as EventListener);
  };
}
