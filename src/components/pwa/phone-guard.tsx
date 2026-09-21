import { useEffect } from "react";
import { lockZoom } from "@/lib/pwa/lock-zoom";

export function PhoneGuard() {
  useEffect(() => lockZoom(), []);
  return null;
}
