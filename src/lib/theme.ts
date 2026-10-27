import { useEffect, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "vb-theme";
const CHANGE_EVENT = "vb-theme-change";

export function getTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Initial theme: stored choice wins, otherwise follow the system preference. */
export function initTheme(): Theme {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  const prefersLight =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme: Theme = stored === "light" || stored === "dark" ? stored : prefersLight ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  return theme;
}

/** Reactive theme state for components (toggle button, chart palettes). */
export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => {
    const handler = () => setThemeState(getTheme());
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const update = (next: Theme) => {
    setTheme(next);
    setThemeState(next);
  };

  return [theme, update];
}
