import { useEffect, useMemo, useRef, useState } from "react";
import { Gem, Crown, Coins, Sparkles, Star, Flame, Diamond } from "lucide-react";
import type { CaseDef, CaseItem } from "@/lib/games/logic";
import { cn } from "@/lib/utils";
import { fmtCompact } from "@/lib/format";

export const TIER_TONE = ["tone-slate", "tone-blue", "tone-cyan", "tone-green", "tone-violet", "tone-magenta", "tone-gold"];
const TIER_ICON = [Coins, Coins, Star, Sparkles, Gem, Diamond, Crown];

export function ItemTile({ item, price, className, compact }: { item: CaseItem; price: number; className?: string; compact?: boolean }) {
  const Icon = TIER_ICON[item.tier] ?? Flame;
  return (
    <div className={cn("flex shrink-0 flex-col items-center justify-center rounded-xl border border-foreground/10 text-center", TIER_TONE[item.tier], compact ? "h-24 w-24 p-2" : "h-32 w-32 p-3", className)}>
      <Icon className={compact ? "size-7" : "size-10"} />
      <p className="mt-1 line-clamp-1 text-[11px] font-bold">{item.name}</p>
      <p className="text-[11px] font-black">{fmtCompact(price * item.mult)}</p>
    </div>
  );
}

function randomItem(def: CaseDef): CaseItem {
  const x = Math.random() * 100;
  let acc = 0;
  for (const it of def.items) { acc += it.chance; if (x < acc) return it; }
  return def.items[0];
}

/** Horizontal spinning reel that lands on `result`. Changing `spinKey` starts a new spin. */
export function CaseReel({ def, result, spinKey, onDone, compact, duration = 4200 }: { def: CaseDef; result: CaseItem | null; spinKey: number; onDone?: () => void; compact?: boolean; duration?: number }) {
  const W = compact ? 104 : 140;
  const WIN = 38;
  const strip = useMemo(() => {
    const s = Array.from({ length: 46 }, () => randomItem(def));
    if (result) s[WIN] = result;
    return s;
  }, [def, result, spinKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [x, setX] = useState(0);
  const [animate, setAnimate] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || !spinKey) return;
    setAnimate(false);
    setX(0);
    const half = (wrap.current?.clientWidth ?? 600) / 2;
    const jitter = (Math.random() - 0.5) * (W * 0.6);
    const id = requestAnimationFrame(() => requestAnimationFrame(() => {
      setAnimate(true);
      setX(-(WIN * W + W / 2 - half + jitter));
    }));
    const t = setTimeout(() => onDone?.(), duration + 100);
    return () => { cancelAnimationFrame(id); clearTimeout(t); };
  }, [spinKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={wrap} className="relative w-full overflow-hidden rounded-2xl border border-border bg-background py-4">
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-0.5 -translate-x-1/2 bg-gradient-primary shadow-glow" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <div className="flex" style={{ transform: `translateX(${x}px)`, transition: animate ? `transform ${duration}ms cubic-bezier(0.1, 0.75, 0.15, 1)` : "none" }}>
        {strip.map((it, i) => (
          <div key={i} style={{ width: W }} className="flex shrink-0 justify-center"><ItemTile item={it} price={def.price} compact={compact} /></div>
        ))}
      </div>
    </div>
  );
}
