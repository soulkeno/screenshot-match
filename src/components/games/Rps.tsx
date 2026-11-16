import { useState } from "react";
import { GameLayout, BetInput, StatBox } from "./GameLayout";
import { useBetAmount, useInstant } from "./useGame";
import { Button } from "@/components/ui/button";
import { RPS_MULT, type RPS } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

const HAND: Record<RPS, string> = { rock: "✊", paper: "✋", scissors: "✌️" };

export default function Rps() {
  const [bet, setBet] = useBetAmount("rps");
  const [choice, setChoice] = useState<RPS>("rock");
  const [house, setHouse] = useState<RPS | null>(null);
  const [shaking, setShaking] = useState(false);
  const [outcome, setOutcome] = useState<"win" | "lose" | "tie" | null>(null);
  const { play, busy } = useInstant("rps");

  async function go() {
    const r = await play(Number(bet), { choice });
    if (!r) return;
    setOutcome(null); setHouse(null); setShaking(true);
    sfx.roll();
    setTimeout(() => {
      setShaking(false);
      setHouse(r.result.house);
      setOutcome(r.result.outcome);
      if (r.result.outcome === "win") sfx.win(); else if (r.result.outcome === "lose") sfx.lose(); else sfx.click();
      r.done();
    }, 1100);
  }

  return (
    <GameLayout slug="rps" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={busy} />
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Win pays" value={`${RPS_MULT}×`} />
          <StatBox label="Tie" value="Bet returned" />
        </div>
        <p className="rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">Profit on win <span className="float-right font-bold text-foreground">{fmt(Number(bet) * RPS_MULT - Number(bet))}</span></p>
        <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={go}>Throw</Button>
      </>
    }>
      <div className="flex h-full flex-col items-center justify-center gap-10 p-6">
        <div className="flex items-center gap-6 md:gap-16">
          <div className="text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">You</p>
            <div className={cn("grid size-32 place-items-center rounded-3xl border-2 bg-surface text-7xl md:size-40", outcome === "win" ? "border-success shadow-glow" : "border-border", shaking && "animate-shake")}>{HAND[choice]}</div>
          </div>
          <span className="font-display text-4xl text-muted-foreground">VS</span>
          <div className="text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">House</p>
            <div className={cn("grid size-32 place-items-center rounded-3xl border-2 bg-surface text-7xl md:size-40", outcome === "lose" ? "border-destructive" : "border-border", shaking && "animate-shake")}>
              {house ? <span className="animate-pop-in">{HAND[house]}</span> : shaking ? "✊" : "?"}
            </div>
          </div>
        </div>
        <div className="h-12">{outcome && <p className={cn("font-display text-5xl tracking-wide animate-pop-in", outcome === "win" ? "text-success" : outcome === "lose" ? "text-destructive" : "text-muted-foreground")}>{outcome === "win" ? "You win!" : outcome === "lose" ? "House wins" : "Tie"}</p>}</div>
        <div className="grid grid-cols-3 gap-3">
          {(["rock", "paper", "scissors"] as RPS[]).map((c) => (
            <button key={c} disabled={busy} onClick={() => { setChoice(c); sfx.click(); }}
              className={cn("rounded-2xl border-2 px-6 py-3 text-center transition-all hover:-translate-y-0.5", choice === c ? "border-primary bg-primary/10" : "border-border bg-surface")}>
              <span className="text-3xl">{HAND[c]}</span>
              <p className="mt-1 text-xs font-bold capitalize">{c}</p>
            </button>
          ))}
        </div>
      </div>
    </GameLayout>
  );
}
