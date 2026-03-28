"use client";

import { useEffect } from "react";

export function PWAInstall() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}
