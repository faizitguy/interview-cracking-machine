import { Command, Wifi, WifiOff } from "lucide-react";

export default function TopBar({
  title,
  connected,
  claudeOk,
  onOpenAssistant,
}: {
  title: string;
  connected: boolean;
  claudeOk: boolean;
  onOpenAssistant: () => void;
}) {
  return (
    <header className="h-14 shrink-0 border-b border-edge bg-panel/60 backdrop-blur flex items-center gap-4 px-6">
      <h1 className="text-bright font-semibold">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        <div
          className="flex items-center gap-1.5 text-xs text-muted"
          title={connected ? "Live file watch connected" : "Reconnecting…"}
        >
          {connected ? <Wifi size={14} className="text-teal" /> : <WifiOff size={14} />}
          {connected ? "live" : "offline"}
        </div>
        <div
          className="text-xs text-muted"
          title={claudeOk ? "claude CLI ready" : "claude CLI unavailable"}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full mr-1.5 ${claudeOk ? "bg-teal" : "bg-faint"}`}
          />
          AI
        </div>
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-2 rounded-lg border border-edge2 bg-panel2 px-3 py-1.5 text-sm text-soft hover:border-violet transition-colors"
        >
          <Command size={14} /> Assistant
          <kbd className="ml-1 text-[10px] text-faint">⌘K</kbd>
        </button>
      </div>
    </header>
  );
}
