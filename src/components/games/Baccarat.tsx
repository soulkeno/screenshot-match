import { useState } from "react";
import { GameLayout } from "./GameLayout";
import { useInstant } from "./useGame";
import { PlayingCard } from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bacTotal, type Card } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

type Side = "player" | "banker" | "tie";
const SIDES: { k: Side; label: string; pays: string }[] = [
  { k: "player", label: "Player", pays: "1:1" },
  { k: "tie", label: "Tie", pays: "8:1" },
  { k: "banker", label: "Banker", pays: "0.95:1" },
];

export default function Baccarat() {
  const [amt, setAmt] = useState<Record<Side, string>>({ player: "100", banker: "0", tie: "0" });
  const [deal, setDeal] = useState<{ player: Card[]; banker: Card[]; winner: Side } | null>(null);
  const [shown, setShown] = useState(0);
  const { play, busy } = useInstant("baccarat");
  const total = Object.values(amt).reduce((s, v) => s + (Number(v) || 0), 0);

  async function go() {
    const r = await play(total, { player: Number(amt.player) || 0, banker: Number(amt.banker) || 0, tie: Number(amt.tie) || 0 });
    if (!r) return;
    setDeal(r.result);
    setShown(0);
    const n = r.result.player.length + r.result.banker.length;
    for (let i = 1; i <= n; i++) setTimeout(() => { setShown(i); sfx.card(); }, i * 380);
    setTimeout(() => { if (r.payout > r.wager) sfx.win(); else if (r.payout < r.wager) sfx.lose(); r.done(); }, n * 380 + 400);
  }

  // deal order: P1, B1, P2, B2, P3?, B3?
  const order: ["player" | "banker", number][] = [];
  if (deal) {
    order.push(["player", 0], ["banker", 0], ["player", 1], ["banker", 1]);
    if (deal.player[2]) order.push(["player", 2]);
    if (deal.banker[2]) order.push(["banker", 2]);
  }
  const visible = (side: "player" | "banker", i: number) => order.findIndex(([s, j]) => s === side && j === i) < shown;
  const done = deal && shown >= order.length;
  const vis = (side: "player" | "banker") => (deal ? deal[side].filter((_, i) => visible(side, i)) : []);

  return (
    <GameLayout slug="baccarat" stageClassName="felt" controls={
      <>
        {SIDES.map((s) => (
          <div key={s.k}>
            <div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold">{s.label}</span><span className="text-muted-foreground">pays {s.pays}</span></div>
            <Input type="number" min={0} value={amt[s.k]} disabled={busy} onChange={(e) => setAmt({ ...amt, [s.k]: e.target.value })} className="h-11 bg-background font-bold" />
          </div>
        ))}
        <p className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">Total bet <span className="float-right font-bold text-foreground">{fmt(total)}</span></p>
        <Button variant="play" size="xl" className="w-full" disabled={busy || total <= 0} onClick={go}>Deal</Button>
      </>
    }>
      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <div className="grid w-full max-w-3xl grid-cols-2 gap-6">
          {(["player", "banker"] as const).map((side) => (
            <div key={side} className={cn("flex flex-col items-center gap-3 rounded-2xl border-2 p-4 transition-colors", done && deal?.winner === side ? "border-success bg-success/10" : "border-accent/20 bg-background/20")}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-[0.3em]">{side}</span>
                {deal && <span className="rounded-full bg-background/80 px-2.5 py-0.5 text-sm font-bold">{bacTotal(vis(side))}</span>}
              </div>
              <div className="flex min-h-[140px] -space-x-10">
                {deal?.[side].map((c, i) => visible(side, i) && <PlayingCard key={`${side}${i}`} card={c} from={{ x: 0, y: -200 }} className={i === 2 ? "rotate-90 ml-4" : ""} />)}
              </div>
            </div>
          ))}
        </div>
        <div className="h-12">{done && <p className="font-display text-5xl tracking-wide text-gold animate-pop-in">{deal!.winner === "tie" ? "Tie" : `${deal!.winner} wins`}</p>}</div>
      </div>
    </GameLayout>
  );
}
