import { useEffect, useState, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Keep the captured event around even if it fired before a component mounted.
let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("loewe:caninstall"));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event("loewe:caninstall"));
  });
}

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

/**
 * Exposes the browser's "Add to Home Screen / Install" capability.
 * `canInstall` is true only when the browser offered the native prompt and the
 * app isn't already installed. On iOS Safari (no prompt API) it stays false —
 * there users install via Share → "Añadir a inicio".
 */
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(!!deferred && !standalone());
  const [installed, setInstalled] = useState(standalone());

  useEffect(() => {
    const update = () => {
      setInstalled(standalone());
      setCanInstall(!!deferred && !standalone());
    };
    window.addEventListener("loewe:caninstall", update);
    return () => window.removeEventListener("loewe:caninstall", update);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    window.dispatchEvent(new Event("loewe:caninstall"));
    return choice.outcome;
  }, []);

  return { canInstall, installed, promptInstall };
}
