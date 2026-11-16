import { useState } from "react";
import { Skull, Gem } from "lucide-react";
import { GameLayout, BetInput, Segmented, StatBox, ResultToast } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { Button } from "@/components/ui/button";
import { TOWERS, TOWER_LEVELS, towerMultiplier, type TowerDiff } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Towers() {
  const [bet, setBet] = useBetAmount("towers");
  const [diff, setDiff] = useState<TowerDiff>("easy");
  const { session, busy, begin, action, active } = useSession("towers");
  const d: TowerDiff = session?.difficulty ?? diff;
  const { cols } = TOWERS[d];
  const level: number = session?.level ?? 0;
  const picks: number[] = session?.picks ?? [];
  const layout: number[][] | undefined = session?.layout;
  const ended = session && session.status !== "active";

  async function pick(col: number) {
    if (!active || busy) return;
    const r = await action("pick", { col });
    if (!r) return;
    if (r.session.status === "lost") sfx.boom(); else if (r.session.status === "won") sfx.win(); else sfx.gem();
  }

  return (
    <GameLayout slug="towers" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} />
        <Segmented label="Difficulty" value={d} onChange={setDiff} disabled={active} options={(Object.keys(TOWERS) as TowerDiff[]).map((k) => ({ value: k, label: k }))} />
        <div className="grid grid-cols-2 gap-2">
          <StatBox label="Current" value={`${towerMultiplier(d, level).toFixed(2)}×`} />
          <StatBox label="Next floor" value={`${towerMultiplier(d, Math.min(TOWER_LEVELS, level + 1)).toFixed(2)}×`} />
        </div>
        {active ? (
          <Button variant="success" size="xl" className="w-full" disabled={busy || level === 0} onClick={async () => { if (await action("cashout")) sfx.cashout(); }}>
            Cash out {fmt(Number(session.wager) * towerMultiplier(d, level))}
          </Button>
        ) : (
          <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={async () => { if (await begin(Number(bet), { difficulty: diff })) sfx.bet(); }}>Bet</Button>
        )}
      </>
    }>
      <div className="grid h-full place-items-center p-4 md:p-8">
        <div className="relative w-full max-w-[480px] space-y-2">
          {Array.from({ length: TOWER_LEVELS }, (_, i) => TOWER_LEVELS - 1 - i).map((l) => {
            const isCurrent = active && l === level;
            const passed = l < level;
            const pickedCol = picks[l];
            return (
              <div key={l} className={cn("grid gap-2 rounded-xl p-1.5 transition-colors", isCurrent && "bg-primary/10 ring-1 ring-primary/40")} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                {Array.from({ length: cols }, (_, c) => {
                  const bad = layout?.[l]?.includes(c);
                  const chosen = pickedCol === c;
                  const show = passed && chosen || (ended && layout);
                  return (
                    <button key={c} disabled={!isCurrent || busy} onClick={() => pick(c)}
                      className={cn("relative flex h-11 items-center justify-center rounded-lg text-xs font-bold transition-all",
                        isCurrent ? "bg-surface-2 shadow-press hover:-translate-y-0.5 hover:bg-muted" : "bg-background",
                        chosen && passed && "ring-2 ring-success/60",
                        chosen && ended && bad && "bg-destructive/25 ring-2 ring-destructive",
                        ended && !chosen && "opacity-50")}>
                      {show ? (bad ? <Skull className="size-5 text-destructive animate-pop-in" /> : <Gem className="size-5 text-success animate-pop-in" />)
                        : <span className="text-muted-foreground tabular">{towerMultiplier(d, l + 1).toFixed(2)}×</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {ended && session.status === "won" && <ResultToast win mult={session.payout / session.wager} payout={session.payout} />}
        </div>
      </div>
    </GameLayout>
  );
}
