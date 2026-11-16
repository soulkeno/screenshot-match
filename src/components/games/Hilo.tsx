import { ArrowUp, ArrowDown, SkipForward } from "lucide-react";
import { GameLayout, BetInput, StatBox, ResultToast } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { PlayingCard } from "./PlayingCard";
import { Button } from "@/components/ui/button";
import { hiloChance, hiloLabel, hiloStepMult, type Card } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Hilo() {
  const [bet, setBet] = useBetAmount("hilo");
  const { session, busy, begin, action, active } = useSession("hilo");
  const cards: Card[] = session?.cards ?? [];
  const history: { guess: string; card: Card; ok: boolean; mult: number }[] = session?.history ?? [];
  const cur = cards[cards.length - 1];
  const mult = session?.multiplier ?? 1;

  async function guess(g: "hi" | "lo" | "skip") {
    const r = await action(g);
    if (!r) return;
    sfx.card();
    if (r.session.status === "lost") setTimeout(sfx.lose, 200);
    else if (g !== "skip") setTimeout(sfx.gem, 150);
  }

  return (
    <GameLayout slug="hilo" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} />
        {active && cur ? (
          <>
            <Button variant="surface" size="xl" className="w-full justify-between" disabled={busy} onClick={() => guess("hi")}>
              <span className="flex items-center gap-2"><ArrowUp className="text-success" />{hiloLabel(cur.rank, "hi")}</span>
              <span className="text-xs text-muted-foreground">{(hiloChance(cur.rank, "hi") * 100).toFixed(1)}% · {hiloStepMult(cur.rank, "hi").toFixed(2)}×</span>
            </Button>
            <Button variant="surface" size="xl" className="w-full justify-between" disabled={busy} onClick={() => guess("lo")}>
              <span className="flex items-center gap-2"><ArrowDown className="text-destructive" />{hiloLabel(cur.rank, "lo")}</span>
              <span className="text-xs text-muted-foreground">{(hiloChance(cur.rank, "lo") * 100).toFixed(1)}% · {hiloStepMult(cur.rank, "lo").toFixed(2)}×</span>
            </Button>
            <Button variant="ghost" className="w-full" disabled={busy} onClick={() => guess("skip")}><SkipForward /> Skip card</Button>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="Multiplier" value={`${mult.toFixed(2)}×`} />
              <StatBox label="Profit" value={fmt(session.wager * mult - session.wager)} />
            </div>
            <Button variant="success" size="xl" className="w-full" disabled={busy || !history.some((h) => h.guess !== "skip")} onClick={async () => { if (await action("cashout")) sfx.cashout(); }}>
              Cash out {fmt(session.wager * mult)}
            </Button>
          </>
        ) : (
          <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={async () => { if (await begin(Number(bet))) sfx.card(); }}>Bet</Button>
        )}
      </>
    }>
      <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
        <div className="flex items-center gap-6">
          <div className="text-center text-xs font-bold text-muted-foreground"><p>K</p><p className="text-[10px]">highest</p></div>
          <div className="relative">
            {cur ? <PlayingCard key={cards.length} card={cur} className="!h-[190px] !w-[136px] md:!h-[220px] md:!w-[156px]" from={{ x: 0, y: -120 }} /> : <PlayingCard card={null} className="!h-[190px] !w-[136px] md:!h-[220px] md:!w-[156px]" />}
          </div>
          <div className="text-center text-xs font-bold text-muted-foreground"><p>A</p><p className="text-[10px]">lowest</p></div>
        </div>
        <div className="flex w-full max-w-2xl gap-2 overflow-x-auto pb-2 no-scrollbar">
          {history.map((h, i) => (
            <div key={i} className="flex shrink-0 flex-col items-center gap-1">
              <PlayingCard card={h.card} small className={cn(!h.ok && "ring-2 ring-destructive")} />
              <span className={cn("text-[10px] font-bold", h.ok ? "text-success" : "text-destructive")}>{h.guess === "skip" ? "skip" : h.ok ? `${h.mult.toFixed(2)}×` : "✕"}</span>
            </div>
          ))}
        </div>
        {session && session.status === "won" && <ResultToast win mult={session.payout / session.wager} payout={session.payout} />}
      </div>
    </GameLayout>
  );
}
