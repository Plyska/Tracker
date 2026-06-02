import type { LucideIcon } from "lucide-react";

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}