import { useLocation } from "react-router-dom";
import { paths } from "@/shared/config/paths";

/** Куди повертатись після входу: `from` (від RequireAuth) або dashboard за замовч. */
export function useFromPath(): string {
  const location = useLocation();
  return (location.state as { from?: string } | null)?.from ?? paths.dashboard;
}
