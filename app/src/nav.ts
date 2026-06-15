import {
  Sun,
  Target,
  CalendarDays,
  RefreshCw,
  MessageSquare,
  BookOpen,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type ScreenId = "today" | "goals" | "schedule" | "review" | "mock" | "diary" | "stats";

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
  /** false once the screen is real; true shows a "coming soon" placeholder. */
  placeholder?: boolean;
  phase?: number;
}

export const NAV: NavItem[] = [
  { id: "today", label: "Today", icon: Sun },
  { id: "diary", label: "Diary", icon: BookOpen },
  { id: "goals", label: "Goals", icon: Target },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "review", label: "Review", icon: RefreshCw },
  { id: "mock", label: "Mock", icon: MessageSquare },
  { id: "stats", label: "Stats", icon: BarChart3 },
];
