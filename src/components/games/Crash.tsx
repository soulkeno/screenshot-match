import { useEffect, useRef, useState } from "react";
import { Rocket } from "lucide-react";
import { GameLayout, BetInput, StatBox } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CRASH_RATE, crashMultAt } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function Crash() {
  const [bet, setBet] = useBetAmount("crash");
  const [auto, setAuto] = useState("");
  const { session, busy, begin, action, active } = useSession("crash");
  const [now, setNow] = useState(0);
  const offset = useRef(0);
  const [history, setHistory] = useState<number[]>([]);
  const cashing = useRef(false);
  const lastStatus = useRef<string | null>(null);

  useEffect(() => {
    if (session?.serverNow) offset.current = session.serverNow - Date.now();
  }, [session?.serverNow]);

  // animation clock
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const tick = () => { setNow(Date.now() + offset.current); id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [active]);

  // poll the server so a crash shows even if you don't click
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => { if (!cashing.current) void action("check", {}, true); }, 500);
    return () => clearInterval(t);
  }, [active, action]);

  useEffect(() => {
    if (!session) return;
    if (session.status !== "active" && lastStatus.current === "active") {
      if (session.status === "lost") sfx.boom(); else sfx.cashout();
      if (session.crashPoint) setHistory((h) => [session.crashPoint, ...h].slice(0, 12));
    }
    lastStatus.current = session.status;
  }, [session]);

  const elapsed = active ? Math.max(0, now - session.startedAt) : 0;
  const m = active ? (now < session.startedAt ? 1 : crashMultAt(elapsed)) : session?.status === "lost" ? session.crashPoint : session?.cashedAt ?? 1;

  // auto cashout on the client side too
  useEffect(() => {
    if (active && session.auto && m >= session.auto && !cashing.current) {
      cashing.current = true;
      void action("cashout", {}, true).finally(() => { cashing.current = false; });
    }
  }, [active, m, session?.auto, action]);

  async function cashout() {
    cashing.current = true;
    await action("cashout");
    cashing.current = false;
  }

  // graph
  const tMax = Math.max(8000, elapsed * 1.15);
  const mMax = Math.max(2, m * 1.2);
  const pts: string[] = [];
  const showT = active ? elapsed : session ? Math.log(Math.max(1, m)) / CRASH_RATE * 1000 : 0;
  for (let i = 0; i <= 40; i++) {
    const t = (showT * i) / 40;
    const mm = Math.exp((CRASH_RATE * t) / 1000);
    pts.push(`${(t / tMax) * 100},${100 - ((mm - 1) / (mMax - 1)) * 92}`);
  }
  const last = pts[pts.length - 1]?.split(",").map(Number) ?? [0, 100];
  const crashed = session?.status === "lost";
  const won = session?.status === "won";
  const countdown = active && now < session.startedAt;

  return (
    <GameLayout slug="crash" controls={
      <>
        <BetInput value={bet} onChange={setBet} disabled={active || busy} />
        <div>
          <p className="mb-1.5 text-xs font-semibold">Auto cash out (optional)</p>
          <Input type="number" min={1.01} step="0.01" placeholder="e.g. 2.00" value={auto} disabled={active} onChange={(e) => setAuto(e.target.value)} className="h-11 bg-background font-bold" />
        </div>
        {active ? (
          <>
            <StatBox label="Payout now" value={<span className="text-success">{fmt(session.wager * m)}</span>} />
            <Button variant="success" size="xl" className="w-full" disabled={countdown} onClick={cashout}>Cash out @ {m.toFixed(2)}×</Button>
          </>
        ) : (
          <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={async () => { if (await begin(Number(bet), { auto: Number(auto) || null })) sfx.bet(); }}>Launch</Button>
        )}
        <p className="text-[11px] text-muted-foreground">The multiplier rises until the rocket crashes. Cash out before it does.</p>
      </>
    }>
      <div className="flex h-full flex-col p-4">
        <div className="flex justify-end gap-1.5">
          {history.map((h, i) => <span key={i} className={cn("rounded-md px-2 py-1 text-xs font-bold tabular animate-pop-in", h >= 2 ? "bg-success text-success-foreground" : "bg-surface-2 text-muted-foreground")}>{h.toFixed(2)}×</span>)}
        </div>
        <div className="relative mt-3 flex-1 overflow-hidden rounded-2xl border border-border bg-background">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="crashfill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--border)" strokeWidth="0.3" />)}
            {session && <polygon points={`0,100 ${pts.join(" ")} ${last[0]},100`} fill="url(#crashfill)" />}
            {session && <polyline points={pts.join(" ")} fill="none" stroke={crashed ? "var(--destructive)" : "var(--primary)"} strokeWidth="1.2" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 4 }} />}
          </svg>
          {session && !crashed && (
            <Rocket className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rotate-45 text-primary drop-shadow" style={{ left: `${Math.min(96, last[0])}%`, top: `${Math.max(4, last[1])}%` }} />
          )}
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              {countdown ? <p className="font-display text-5xl tracking-wide text-muted-foreground">Starting...</p> : (
                <p className={cn("font-display text-[clamp(4rem,10vw,7rem)] leading-none tracking-wide tabular", crashed ? "text-destructive animate-shake" : won ? "text-success" : "text-foreground")}>{(m ?? 1).toFixed(2)}×</p>
              )}
              {crashed && <p className="mt-2 font-bold text-destructive">Crashed!</p>}
              {won && <p className="mt-2 font-bold text-success">Cashed out {fmt(session.payout)}</p>}
              {!session && <p className="text-muted-foreground">Place a bet to launch</p>}
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
