import { useState } from "react";
import { Bomb, Gem, Shuffle } from "lucide-react";
import { GameLayout, BetInput, StatBox, ResultToast } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { Button } from "@/components/ui/button";
import { minesMultiplier } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Mines() {
  const [bet, setBet] = useBetAmount("mines");
  const [mines, setMines] = useState(3);
  const { session, busy, begin, action, active } = useSession("mines");
  const [pending, setPending] = useState<number | null>(null);
  const revealed: number[] = session?.revealed ?? [];
  const minePos: number[] = session?.minePositions ?? [];
  const m = active ? session.mines : mines;

  async function start() {
    const r = await begin(Number(bet), { mines });
    if (r) sfx.bet();
  }
  async function reveal(t: number) {
    if (!active || busy || revealed.includes(t)) return;
    setPending(t);
    const r = await action("reveal", { tile: t });
    setPending(null);
    if (!r) return;
    if (r.session.status === "lost") sfx.boom();
    else if (r.session.status === "won") { sfx.gem(); setTimeout(sfx.win, 150); }
    else sfx.gem();
  }
  async function cashout() {
    const r = await action("cashout");
    if (r) sfx.cashout();
  }
  function randomPick() {
    const free = Array.from({ length: 25 }, (_, i) => i).filter((i) => !revealed.includes(i));
    void reveal(free[Math.floor(Math.random() * free.length)]);
  }

  const ended = session && session.status !== "active";
  return (
    <GameLayout slug="mines" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} />
        <div>
          <p className="mb-1.5 text-xs font-semibold">Mines</p>
          <div className="grid grid-cols-6 gap-1">
            {[1, 3, 5, 10, 15, 24].map((n) => (
              <button key={n} disabled={active} onClick={() => setMines(n)} className={cn("rounded-md border py-1.5 text-xs font-bold transition-colors disabled:opacity-50", m === n ? "border-primary bg-primary/15 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground")}>{n}</button>
            ))}
          </div>
          <input type="range" min={1} max={24} value={m} disabled={active} onChange={(e) => setMines(Number(e.target.value))} className="mt-2 w-full accent-[var(--primary)]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Gems" value={25 - m} />
          <StatBox label={active ? "Current" : "First tile"} value={`${(active ? session.multiplier : minesMultiplier(mines, 1)).toFixed(2)}×`} />
        </div>
        {active ? (
          <>
            <StatBox label="Profit" value={<span className="text-success">{fmt(Number(session.wager) * session.multiplier - Number(session.wager))}</span>} />
            <Button variant="surface" className="w-full" disabled={busy} onClick={randomPick}><Shuffle /> Pick random tile</Button>
            <Button variant="success" size="xl" className="w-full" disabled={busy || revealed.length === 0} onClick={cashout}>Cash out {fmt(Number(session.wager) * session.multiplier)}</Button>
          </>
        ) : (
          <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={start}>Bet</Button>
        )}
      </>
    }>
      <div className="grid h-full place-items-center p-4 md:p-8">
        <div className="relative w-full max-w-[520px]">
          <div className="grid grid-cols-5 gap-2 md:gap-3">
            {Array.from({ length: 25 }, (_, i) => {
              const isRev = revealed.includes(i);
              const isMine = ended && minePos.includes(i);
              const hit = session?.hit === i;
              const showGem = isRev || (ended && !minePos.includes(i));
              return (
                <button key={i} onClick={() => reveal(i)} disabled={!active || isRev}
                  className={cn("relative aspect-square rounded-xl transition-all duration-200",
                    !isRev && !ended && "bg-surface-2 shadow-press hover:-translate-y-1 hover:bg-muted",
                    active && !isRev && "cursor-pointer",
                    isRev && "bg-background ring-2 ring-success/60",
                    ended && !isRev && "bg-background",
                    hit && "bg-destructive/25 ring-2 ring-destructive",
                    pending === i && "animate-pulse")}>
                  {(showGem || isMine) && (
                    <span className={cn("absolute inset-0 grid place-items-center animate-pop-in", ended && !isRev && !hit && "opacity-40")}>
                      {isMine ? <Bomb className="size-1/2 text-destructive drop-shadow" /> : <Gem className="size-1/2 text-success drop-shadow" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {ended && session.status === "won" && <ResultToast win mult={session.payout / session.wager} payout={session.payout} />}
        </div>
      </div>
    </GameLayout>
  );
}
