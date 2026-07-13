import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initNotificationSound } from "./lib/notify";

initNotificationSound();
createRoot(document.getElementById("root")!).render(<App />);
