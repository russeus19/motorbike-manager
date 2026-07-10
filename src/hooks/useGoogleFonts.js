import { useEffect } from "react";

/**
 * Loads the Rajdhani/Inter/JetBrains Mono Google Fonts used throughout the
 * UI. index.html already preloads these fonts for the fastest possible
 * first paint; this hook is kept so the component behaves exactly as it
 * did before the project was split into multiple files (defense in depth
 * in case the app is ever embedded somewhere index.html isn't controlled).
 */
export function useGoogleFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}
