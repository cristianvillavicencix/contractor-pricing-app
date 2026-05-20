"use client";

import { useEffect } from "react";

/**
 * Marks the body with `data-v2` so CSS rules can scope hiding of legacy
 * widgets (e.g. the floating calculator) while v2 pages are active.
 */
export function V2BodyTag() {
  useEffect(() => {
    document.body.setAttribute("data-v2", "true");
    return () => {
      document.body.removeAttribute("data-v2");
    };
  }, []);
  return null;
}
