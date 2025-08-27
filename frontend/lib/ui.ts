import { create } from "zustand";

interface UIStore {
  isMobile: boolean;
  commandPaletteOpen: boolean;
  setIsMobile: (mobile: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isMobile: false,
  commandPaletteOpen: false,
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));

export function useTheme() {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const setTheme = (theme: "light" | "dark" | "system") => {
    if (theme === "system") {
      localStorage.removeItem("theme");
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", systemTheme === "dark");
    } else {
      localStorage.setItem("theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  };

  const getTheme = (): "light" | "dark" | "system" => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    return stored || "system";
  };

  return { toggleTheme, setTheme, getTheme };
}

export function useKeyboardShortcuts() {
  const handleKeydown = (event: KeyboardEvent) => {
    const { key, metaKey, ctrlKey, altKey, shiftKey } = event;
    const isCtrlOrCmd = metaKey || ctrlKey;

    // Command palette
    if (isCtrlOrCmd && key === "k" && !altKey && !shiftKey) {
      event.preventDefault();
      useUIStore.getState().setCommandPaletteOpen(true);
    }

    // Close command palette / modal
    if (key === "Escape") {
      useUIStore.getState().setCommandPaletteOpen(false);
    }
  };

  return { handleKeydown };
}

export function useMediaQuery(query: string): boolean {
  if (typeof window === "undefined") return false;
  
  const mediaQuery = window.matchMedia(query);
  const [matches, setMatches] = useState(mediaQuery.matches);

  useEffect(() => {
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, [mediaQuery]);

  return matches;
}

// This needs to be imported properly
import { useState, useEffect } from "react";
