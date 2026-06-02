import { useEffect, type ReactNode } from "react";
import { useAppSelector } from "@/app/store/hooks";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useAppSelector((s) => s.theme.value);
  const accent = useAppSelector((s) => s.accent.value);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  return children;
}
