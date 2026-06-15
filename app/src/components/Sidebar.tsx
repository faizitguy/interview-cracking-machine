import { NAV, type ScreenId } from "../nav";

export default function Sidebar({
  active,
  onSelect,
}: {
  active: ScreenId;
  onSelect: (id: ScreenId) => void;
}) {
  return (
    <aside className="w-56 shrink-0 border-r border-edge bg-panel flex flex-col">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-violet grid place-items-center text-white font-bold text-sm">
            I
          </div>
          <div className="leading-tight">
            <div className="text-bright font-semibold text-sm">Interview</div>
            <div className="text-faint text-xs">Cracking Machine</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={[
                "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-edge text-bright"
                  : "text-muted hover:text-soft hover:bg-panel2",
              ].join(" ")}
            >
              <Icon size={17} className={isActive ? "text-violet2" : ""} />
              <span>{item.label}</span>
              {item.placeholder && (
                <span className="ml-auto text-[10px] text-faint">P{item.phase}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-5 py-4 text-[11px] text-faint border-t border-edge">
        Local-first · files are truth
      </div>
    </aside>
  );
}
