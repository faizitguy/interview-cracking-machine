import {
  MessageSquare,
  Braces,
  Network,
  Sparkles,
  FileCode2,
  Database,
  LayoutDashboard,
  Layers,
  type LucideIcon,
} from "lucide-react";

/** Icon per interview round — shared across Setup, Learn, and Practice. */
export const ROUND_ICON: Record<string, LucideIcon> = {
  general: MessageSquare,
  dsa: Braces,
  "system-design": Network,
  "ai-engineering": Sparkles,
  python: FileCode2,
  backend: Database,
  frontend: LayoutDashboard,
  fullstack: Layers,
};

export const roundIcon = (id: string): LucideIcon => ROUND_ICON[id] ?? MessageSquare;

/** Seniority levels offered across modules. */
export const LEVELS = ["junior", "mid", "senior", "staff"] as const;
