import { useState } from "react";
import { Flame, Crown } from "lucide-react";
import { GameLayout, BetInput, Segmented, StatBox } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { COINFLIP_MULT, type CoinSide } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Coin3D({ rotation, spinning, size = 220 }: { rotation: number; spinning: boolean; size?: number }) {
  return (
    <div className="perspective" style={{ width: size, height: size }}>
      <div className="relative h-full w-full" style={{ transformStyle: "preserve-3d", transform: `rotateY(${rotation}deg)`, transition: spinning ? "transform 1.6s cubic-bezier(0.2, 0.7, 0.2, 1)" : "none" }}>
        <div className="backface-hidden absolute inset-0 grid place-items-center rounded-full bg-gradient-gold shadow-glow ring-8 ring-gold/40">
          <div className="grid size-[70%] place-items-center rounded-full border-4 border-primary-foreground/20"><Flame className="size-1/2 text-primary-foreground/80" strokeWidth={2.5} /></div>
        </div>
        <div className="backface-hidden rotate-y-180 absolute inset-0 grid place-items-center rounded-full bg-gradient-primary shadow-glow ring-8 ring-primary/40">
          <div className="grid size-[70%] place-items-center rounded-full border-4 border-primary-foreground/20"><Crown className="size-1/2 text-primary-foreground/80" strokeWidth={2.5} /></div>
        </div>
      </div>
    </div>
  );
}

export default function Coinflip() {
  const [bet, setBet] = useBetAmount("coinflip");
  const [side, setSide] = useState<CoinSide>("heads");
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [res, setRes] = useState<{ win: boolean; side: CoinSide } | null>(null);
  const [history, setHistory] = useState<CoinSide[]>([]);
  const { play, busy } = useInstant("coinflip");

  async function go() {
    const r = await play(Number(bet), { side });
    if (!r) return;
    setRes(null);
    const face = r.result.result === "heads" ? 0 : 180;
    const base = Math.ceil(rot / 360) * 360 + 360 * 5;
    setSpinning(true);
    setRot(base + face);
    sfx.flip();
    setTimeout(() => {
      setSpinning(false);
      setRes({ win: r.result.win, side: r.result.result });
      setHistory((h) => [r.result.result as CoinSide, ...h].slice(0, 12));
      if (r.result.win) sfx.win(); else sfx.lose();
      r.done();
    }, 1650);
  }

  return (
    <GameLayout slug="coinflip" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <Segmented label="Pick a side" value={side} onChange={setSide} disabled={busy} options={[{ value: "heads", label: "Heads" }, { value: "tails", label: "Tails" }]} />
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Multiplier" value={`${COINFLIP_MULT}×`} />
          <StatBox label="Profit on win" value={fmt(Number(bet) * COINFLIP_MULT - Number(bet))} />
        </div>
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={go}>Flip coin</Button>
      </>
    }>
      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <Coin3D rotation={rot} spinning={spinning} />
        <div className="h-10 text-center">
          {res && <p className={cn("font-display text-4xl tracking-wide animate-pop-in", res.win ? "text-success" : "text-destructive")}>{res.side} · {res.win ? "You win" : "You lose"}</p>}
        </div>
        <div className="flex gap-1.5">
          {history.map((h, i) => <span key={i} className={cn("grid size-7 place-items-center rounded-full animate-pop-in", h === "heads" ? "bg-gradient-gold" : "bg-gradient-primary")}>{h === "heads" ? <Flame className="size-3.5 text-primary-foreground" /> : <Crown className="size-3.5 text-primary-foreground" />}</span>)}
        </div>
      </div>
    </GameLayout>
  );
}
