import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ColorTheme = "light" | "dark";

const STORAGE_KEY = "pulpit:theme";
// VERIFIED (PatternFly dark theme handbook): dark mode is enabled purely by
// adding this class to <html> - PatternFly ships no toggle component itself.
const DARK_CLASS = "pf-v6-theme-dark";
// Product decision: Pulpit defaults to light rather than following the OS
// prefers-color-scheme - a deliberate choice, not PatternFly's own
// recommendation (see docs/UX.md "Theming"). The toggle still switches to
// dark, and that choice is remembered once made.
const DEFAULT_THEME: ColorTheme = "light";

function getPreferredTheme(): ColorTheme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // Storage can be disabled by the browser; the app must still start.
  }
  return DEFAULT_THEME;
}

interface ThemeContextValue {
  theme: ColorTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ColorTheme>(getPreferredTheme);

  useEffect(() => {
    document.documentElement.classList.toggle(DARK_CLASS, theme === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme changes still work for the current session without persistence.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + accompanying hook is the standard pattern
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
