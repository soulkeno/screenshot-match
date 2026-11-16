import { useState } from "react";
import { Package } from "lucide-react";
import { GameLayout } from "./GameLayout";
import { useInstant } from "./useGame";
import { CaseReel, ItemTile, TIER_TONE } from "./CaseReel";
import { Button } from "@/components/ui/button";
import { Coin } from "@/components/common/bits";
import { CASES, type CaseItem } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Cases() {
  const [caseId, setCaseId] = useState(CASES[0].id);
  const def = CASES.find((c) => c.id === caseId)!;
  const [result, setResult] = useState<CaseItem | null>(null);
  const [spinKey, setSpinKey] = useState(0);
  const [won, setWon] = useState<CaseItem | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const { play, busy } = useInstant("cases");

  async function open() {
    const r = await play(def.price, { caseId });
    if (!r) return;
    setWon(null);
    setResult(r.result.item);
    setSpinKey((k) => k + 1);
    setPending(() => r.done);
    for (let i = 0; i < 14; i++) setTimeout(sfx.tick, i * i * 18);
  }
  function landed() {
    setWon(result);
    if (result && result.mult >= 1) sfx.win(); else sfx.lose();
    pending?.();
    setPending(null);
  }

  return (
    <GameLayout slug="cases" controls={
      <>
        <p className="text-xs font-semibold">Choose a case</p>
        <div className="grid grid-cols-2 gap-2">
          {CASES.map((c) => (
            <button key={c.id} disabled={busy} onClick={() => setCaseId(c.id)} className={cn("rounded-xl border-2 p-3 text-left transition", caseId === c.id ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40")}>
              <Package className="mb-1 size-6 text-primary" />
              <p className="text-sm font-bold">{c.name}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground"><Coin className="size-3" />{fmtCompact(c.price)}</p>
            </button>
          ))}
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={open}>Open for {fmt(def.price, 0)}</Button>
      </>
    }>
      <div className="flex h-full flex-col justify-center gap-6 p-4 md:p-8">
        <div className="text-center">
          <h3 className="font-display text-4xl tracking-wide">{def.name}</h3>
          <div className="h-8">{won && <p className={cn("text-lg font-bold animate-pop-in", won.mult >= 1 ? "text-success" : "text-muted-foreground")}>You unboxed {won.name} · {fmt(def.price * won.mult)}</p>}</div>
        </div>
        <CaseReel def={def} result={result} spinKey={spinKey} onDone={landed} />
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Case contents</p>
          <div className="flex flex-wrap justify-center gap-2">
            {def.items.map((it) => (
              <div key={it.name} className="relative">
                <ItemTile item={it} price={def.price} compact />
                <span className={cn("absolute -top-2 right-1 rounded-full px-1.5 text-[10px] font-black", TIER_TONE[it.tier])}>{it.chance}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
