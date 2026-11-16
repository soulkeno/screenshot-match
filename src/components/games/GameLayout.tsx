import { useEffect, useState, type ReactNode } from "react";
import { Star, ShieldCheck, Volume2, VolumeX } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { GAME_BY_SLUG } from "@/lib/games/registry";
import { isMuted, setMuted } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Coin } from "@/components/common/bits";

export function GameLayout({ slug, controls, children, stageClassName }: { slug: string; controls: ReactNode; children: ReactNode; stageClassName?: string }) {
  const meta = GAME_BY_SLUG[slug];
  const { favorites, toggleFavorite, setFairOpen } = useApp();
  const [muted, setM] = useState(false);
  useEffect(() => setM(isMuted()), []);
  const fav = favorites.has(slug);
  return (
    <div className="panel overflow-hidden shadow-card">
      <div className="grid lg:grid-cols-[320px_1fr]">
        <div className="order-2 space-y-4 border-t border-border bg-surface p-4 lg:order-1 lg:border-r lg:border-t-0">{controls}</div>
        <div className={cn("relative order-1 min-h-[420px] overflow-hidden lg:order-2 lg:min-h-[560px]", stageClassName)}>{children}</div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-1">
          <button onClick={() => toggleFavorite(slug)} className={cn("rounded-md p-2 transition-colors hover:bg-surface-2", fav ? "text-gold" : "text-muted-foreground")} aria-label="Favourite">
            <Star className={cn("size-4", fav && "fill-current")} />
          </button>
          <button onClick={() => { setMuted(!muted); setM(!muted); }} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Toggle sound">
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold">
          {meta && <meta.icon className="size-4 text-primary" />}
          {meta?.name}
        </div>
        <button onClick={() => setFairOpen(true)} className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
          <ShieldCheck className="size-4 text-success" /> Fairness
        </button>
      </div>
    </div>
  );
}

export function BetInput({ value, onChange, disabled, label = "Bet amount" }: { value: string; onChange: (v: string) => void; disabled?: boolean; label?: string }) {
  const { balance } = useApp();
  const n = Number(value) || 0;
  const set = (v: number) => onChange(String(Math.max(0, Math.floor(v * 100) / 100)));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">Balance {fmt(balance)}</span>
      </div>
      <div className="flex overflow-hidden rounded-lg border border-border bg-background focus-within:border-primary/50">
        <div className="flex flex-1 items-center gap-2 px-3">
          <Coin />
          <input type="number" inputMode="decimal" min={0} step="any" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}
            className="h-11 w-full min-w-0 bg-transparent text-sm font-bold tabular outline-none disabled:opacity-60" />
        </div>
        {[
          { l: "½", f: () => set(n / 2) },
          { l: "2×", f: () => set(n * 2) },
          { l: "MAX", f: () => set(balance) },
        ].map((b) => (
          <button key={b.l} type="button" disabled={disabled} onClick={b.f} className="border-l border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50">{b.l}</button>
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string | number>({ label, options, value, onChange, disabled }: { label?: string; options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div>
      {label && <p className="mb-1.5 text-xs font-semibold">{label}</p>}
      <div className="grid gap-1 rounded-lg border border-border bg-background p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button key={String(o.value)} type="button" disabled={disabled} onClick={() => onChange(o.value)}
            className={cn("rounded-md py-2 text-xs font-bold capitalize transition-all disabled:opacity-50", value === o.value ? "bg-surface-2 text-foreground shadow-press ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground")}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StatBox({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-border bg-background px-3 py-2", className)}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-bold tabular">{value}</div>
    </div>
  );
}

export function ResultToast({ win, mult, payout }: { win: boolean; mult: number; payout: number }) {
  return (
    <div className={cn("pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 px-8 py-5 text-center shadow-card backdrop-blur animate-pop-in",
      win ? "border-success bg-background/85" : "border-destructive/60 bg-background/85")}>
      <p className={cn("font-display text-5xl leading-none tracking-wide", win ? "text-success" : "text-destructive")}>{mult.toFixed(2)}×</p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold"><Coin />{fmt(payout)}</p>
    </div>
  );
}
