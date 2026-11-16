import { useEffect, useRef, useState } from "react";
import { Worm, Dices } from "lucide-react";
import { GameLayout, BetInput, Segmented, StatBox, ResultToast } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { Button } from "@/components/ui/button";
import { SNAKE_BOARDS, type SnakeDiff } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

const CELL: [number, number][] = [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0]];
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function Die({ v, rolling }: { v: number; rolling: boolean }) {
  return (
    <div className={cn("grid size-14 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl bg-playing-card p-2 shadow-card md:size-16", rolling && "animate-shake")}>
      {Array.from({ length: 9 }, (_, i) => <span key={i} className={cn("m-auto size-2.5 rounded-full", PIPS[v]?.includes(i) ? "bg-suit-black" : "bg-transparent")} />)}
    </div>
  );
}

export default function Snakes() {
  const [bet, setBet] = useBetAmount("snakes");
  const [diff, setDiff] = useState<SnakeDiff>("easy");
  const { session, busy, begin, action, active } = useSession("snakes");
  const d: SnakeDiff = session?.difficulty ?? diff;
  const board = SNAKE_BOARDS[d];
  const [shownPos, setShownPos] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [rolling, setRolling] = useState(false);
  const animating = useRef(false);

  useEffect(() => { if (session && !animating.current) setShownPos(session.pos ?? 0); }, [session]);

  async function roll() {
    setRolling(true);
    sfx.roll();
    const r = await action("roll");
    if (!r) { setRolling(false); return; }
    const last = r.session.rolls[r.session.rolls.length - 1];
    setDice(last.dice);
    setRolling(false);
    animating.current = true;
    const steps = last.dice[0] + last.dice[1];
    for (let i = 1; i <= steps; i++) setTimeout(() => { setShownPos((last.from + i) % 12); sfx.tick(); }, i * 110);
    setTimeout(() => {
      animating.current = false;
      if (last.value === 0) sfx.boom(); else sfx.gem();
    }, steps * 110 + 60);
  }

  const mult = session?.multiplier ?? 1;
  return (
    <GameLayout slug="snakes" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} />
        <Segmented label="Difficulty" value={d} onChange={setDiff} disabled={active} options={(Object.keys(SNAKE_BOARDS) as SnakeDiff[]).map((k) => ({ value: k, label: k }))} />
        {active ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Multiplier" value={`${mult.toFixed(2)}×`} />
              <StatBox label="Rolls" value={session.rolls.length} />
            </div>
            <Button variant="play" size="xl" className="w-full" disabled={busy || rolling} onClick={roll}><Dices /> Roll dice</Button>
            <Button variant="success" size="lg" className="w-full" disabled={busy || !session.rolls.length} onClick={async () => { if (await action("cashout")) sfx.cashout(); }}>Cash out {fmt(session.wager * mult)}</Button>
          </>
        ) : (
          <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={async () => { if (await begin(Number(bet), { difficulty: diff })) { setShownPos(0); sfx.bet(); } }}>Bet</Button>
        )}
        <p className="text-[11px] text-muted-foreground">Each roll moves you around the board and multiplies your total by the tile you land on. Land on a snake and you lose.</p>
      </>
    }>
      <div className="grid h-full place-items-center p-4">
        <div className="relative grid aspect-square w-full max-w-[480px] grid-cols-4 grid-rows-4 gap-2">
          {CELL.map(([r, c], i) => {
            const v = board[i];
            const here = shownPos === i && (active || session);
            return (
              <div key={i} style={{ gridRow: r + 1, gridColumn: c + 1 }}
                className={cn("relative grid place-items-center rounded-xl border-2 text-sm font-black transition-all",
                  v === 0 ? "border-destructive/40 bg-destructive/15 text-destructive" : v >= 1 ? "border-success/30 bg-success/10 text-success" : "border-border bg-surface-2 text-muted-foreground",
                  here && "scale-105 ring-4 ring-primary")}>
                {i === 0 && <span className="absolute left-1.5 top-1 text-[9px] uppercase tracking-wider text-muted-foreground">Start</span>}
                {v === 0 ? <Worm className="size-8" /> : `${v}×`}
                {here && <span className="absolute -bottom-2 left-1/2 size-5 -translate-x-1/2 rounded-full bg-gradient-primary shadow-glow animate-pop-in" />}
              </div>
            );
          })}
          <div className="col-span-2 col-start-2 row-span-2 row-start-2 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background">
            <div className="flex gap-3"><Die v={dice[0]} rolling={rolling} /><Die v={dice[1]} rolling={rolling} /></div>
            <p className="font-display text-3xl tracking-wide">{mult.toFixed(2)}×</p>
          </div>
          {session && session.status !== "active" && <ResultToast win={session.payout > session.wager} mult={session.payout / session.wager} payout={session.payout} />}
        </div>
      </div>
    </GameLayout>
  );
}
