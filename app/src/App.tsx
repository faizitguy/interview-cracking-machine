import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import AssistantPanel from "./components/AssistantPanel";
import Today from "./screens/Today";
import Diary from "./screens/Diary";
import Goals from "./screens/Goals";
import Schedule from "./screens/Schedule";
import Review from "./screens/Review";
import Stats from "./screens/Stats";
import Placeholder from "./screens/Placeholder";
import { NAV, type ScreenId } from "./nav";
import { useWatch } from "./lib/useWatch";
import { checkHealth } from "./lib/api";

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("today");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [rev, setRev] = useState(0); // bumped on every file change → screens refetch
  const [claudeOk, setClaudeOk] = useState(true);

  const connected = useWatch(() => setRev((r) => r + 1));

  useEffect(() => {
    checkHealth().then((h) => setClaudeOk(h.ok));
  }, []);

  // ⌘K / Ctrl-K toggles the assistant; Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAssistantOpen((o) => !o);
      } else if (e.key === "Escape") {
        setAssistantOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = NAV.find((n) => n.id === screen)!;

  return (
    <div className="h-full flex bg-ink text-soft">
      <Sidebar active={screen} onSelect={setScreen} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          title={current.label}
          connected={connected}
          claudeOk={claudeOk}
          onOpenAssistant={() => setAssistantOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {screen === "today" && <Today rev={rev} />}
          {screen === "diary" && <Diary />}
          {screen === "goals" && <Goals rev={rev} />}
          {screen === "schedule" && <Schedule rev={rev} />}
          {screen === "review" && <Review rev={rev} />}
          {screen === "stats" && <Stats rev={rev} />}
          {current.placeholder && <Placeholder id={screen} />}
        </main>
      </div>
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
}
