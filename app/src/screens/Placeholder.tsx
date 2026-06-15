import { NAV, type ScreenId } from "../nav";

export default function Placeholder({ id }: { id: ScreenId }) {
  const item = NAV.find((n) => n.id === id)!;
  const Icon = item.icon;
  return (
    <div className="h-full grid place-items-center p-8">
      <div className="text-center">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-panel border border-edge grid place-items-center mb-4">
          <Icon size={24} className="text-violet2" />
        </div>
        <h2 className="text-xl font-semibold text-bright">{item.label}</h2>
        <p className="text-muted text-sm mt-1">Coming in Phase {item.phase}.</p>
      </div>
    </div>
  );
}
