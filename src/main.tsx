import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNotificationSound } from "./lib/notify";

initNotificationSound();
createRoot(document.getElementById("root")!).render(<App />);

// Register the PWA service worker (production builds only — in dev it would
// interfere with Vite's HMR).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
