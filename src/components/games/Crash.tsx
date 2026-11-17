import { useEffect, useRef, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Rocket, Users, Clock, ShieldCheck, Flame, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { GameLayout, BetInput, StatBox } from "./GameLayout";
import { useBetAmount } from "./useGame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Amount, Coin, UserAvatar } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { crashStateFn, crashBetFn, crashCashoutFn } from "@/lib/games.functions";
import { CRASH_RATE, crashMultAt } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { errMsg, fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

type CrashBetItem = {
  userId: string;
  username: string;
  wager: number;
  cashedAt: number | null;
  payout: number;
  settled: boolean;
};

type CrashHistoryItem = {
  seq: number;
  crashPoint: number;
  hash: string;
  serverSeed: string | null;
};

type CrashStateResponse = {
  serverNow: number;
  round: {
    seq: number;
    hash: string;
    startsAt: number;
    phase: "betting" | "running" | "crashed";
    crashPoint: number | null;
    endsAt: number | null;
    serverSeed: string | null;
  };
  bets: CrashBetItem[];
  me: {
    wager: number;
    auto: number | null;
    cashedAt: number | null;
    payout: number;
    settled: boolean;
  } | null;
  history: CrashHistoryItem[];
};

export default function Crash() {
  const { setBalance, userId } = useApp();
  const [bet, setBet] = useBetAmount("crash");
  const [auto, setAuto] = useState("");

  const getState = useServerFn(crashStateFn);
  const placeBetFn = useServerFn(crashBetFn);
  const cashoutFn = useServerFn(crashCashoutFn);

  const [state, setState] = useState<CrashStateResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const cashing = useRef(false);
  const prevPhase = useRef<string | null>(null);
  const prevSettled = useRef(false);

  // Poll state loop
  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = (await getState()) as CrashStateResponse;
        if (!alive) return;
        offset.current = res.serverNow - Date.now();
        setState(res);

        // Sound effect triggers on phase change
        if (prevPhase.current === "running" && res.round.phase === "crashed") {
          try { sfx.boom(); } catch {}
        }
        if (res.me?.settled && res.me.payout > 0 && !prevSettled.current) {
          try { sfx.cashout(); } catch {}
        }
        prevPhase.current = res.round.phase;
        prevSettled.current = !!res.me?.settled;
      } catch {}
    }

    void poll();
    const timer = setInterval(poll, 600);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [getState]);

  // RequestAnimationFrame animation clock synchronized with server time
  useEffect(() => {
    let id = 0;
    const tick = () => {
      setNow(Date.now() + offset.current);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const round = state?.round;
  const me = state?.me;

  // Real-time phase calculation based on synchronized server time
  const isBetting = !round || now < round.startsAt;
  const isCrashed = round?.phase === "crashed" || (round?.endsAt != null && now >= round.endsAt);
  const isRunning = !isBetting && !isCrashed;

  const currentPhase: "betting" | "running" | "crashed" = isBetting
    ? "betting"
    : isCrashed
    ? "crashed"
    : "running";

  const elapsed = isRunning && round ? Math.max(0, now - round.startsAt) : isCrashed && round ? Math.max(0, (round.endsAt ?? now) - round.startsAt) : 0;
  const m = isRunning
    ? Math.max(1, crashMultAt(elapsed))
    : isCrashed && round?.crashPoint
    ? Number(round.crashPoint)
    : 1;

  // Auto cashout on client side
  useEffect(() => {
    if (isRunning && me && !me.settled && me.auto && m >= me.auto && !cashing.current) {
      cashing.current = true;
      cashoutFn()
        .then((res: any) => {
          setBalance(res.balance);
          setState(res.state);
          try { sfx.cashout(); } catch {}
          toast.success(`Auto-cashed out at ${Number(res.cashedAt).toFixed(2)}×! 🎉`);
        })
        .catch(() => {})
        .finally(() => {
          cashing.current = false;
        });
    }
  }, [isRunning, me, m, cashoutFn, setBalance]);

  // Place Bet
  async function handleBet() {
    const wager = Number(bet);
    if (!Number.isFinite(wager) || wager < 1) return toast.error("Enter a valid bet (min 1)");
    const autoVal = auto.trim() ? Number(auto) : null;
    if (autoVal !== null && (!Number.isFinite(autoVal) || autoVal < 1.01)) {
      return toast.error("Auto cashout must be at least 1.01×");
    }

    setBusy(true);
    try {
      const res = (await placeBetFn({ data: { wager, auto: autoVal } })) as any;
      setBalance(res.balance);
      setState(res.state);
      try { sfx.bet(); } catch {}
      toast.success(`Bet placed for Launch #${res.state?.round?.seq}!`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  // Manual Cashout
  async function handleCashout() {
    cashing.current = true;
    setBusy(true);
    try {
      const res = (await cashoutFn()) as any;
      setBalance(res.balance);
      setState(res.state);
      try { sfx.cashout(); } catch {}
      toast.success(`Cashed out at ${Number(res.cashedAt).toFixed(2)}× (+${fmt(res.payout)} coins)! 🎉`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
      cashing.current = false;
    }
  }

  // Trajectory curve computation
  const tMax = Math.max(8000, elapsed * 1.15);
  const mMax = Math.max(2, m * 1.2);
  const pts: string[] = [];
  const showT = currentPhase !== "betting" ? elapsed : 0;
  for (let i = 0; i <= 40; i++) {
    const t = (showT * i) / 40;
    const mm = Math.exp((CRASH_RATE * t) / 1000);
    pts.push(`${(t / tMax) * 100},${100 - ((mm - 1) / (mMax - 1)) * 92}`);
  }
  const last = pts[pts.length - 1]?.split(",").map(Number) ?? [0, 100];

  const secondsToLaunch = round ? Math.max(0, (round.startsAt - now) / 1000) : 0;
  const hasActiveBet = me && !me.settled;
  const hasWon = me && me.settled && me.payout > 0;
  const hasLost = me && me.settled && me.payout === 0 && isCrashed;

  return (
    <GameLayout
      slug="crash"
      controls={
        <>
          {/* Round Status Banner */}
          <div className="rounded-xl border border-border bg-surface-2 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-muted-foreground">Round #{round?.seq ?? "..."}</span>
              <span className="flex items-center gap-1.5 font-bold">
                {currentPhase === "betting" ? (
                  <span className="flex items-center gap-1 text-accent animate-pulse">
                    <Clock className="size-3.5" /> Launching in {secondsToLaunch.toFixed(1)}s
                  </span>
                ) : currentPhase === "running" ? (
                  <span className="flex items-center gap-1 text-success">
                    <Rocket className="size-3.5 animate-bounce" /> Climbing...
                  </span>
                ) : (
                  <span className="text-destructive font-black">CRASHED</span>
                )}
              </span>
            </div>
            {currentPhase === "betting" && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-background">
                <div
                  className="h-full bg-accent transition-all duration-100 ease-linear"
                  style={{ width: `${Math.min(100, (secondsToLaunch / 7) * 100)}%` }}
                />
              </div>
            )}
          </div>

          <BetInput value={bet} onChange={setBet} disabled={busy || hasActiveBet || (!isBetting && !isCrashed)} />

          <div>
            <p className="mb-1.5 text-xs font-semibold">Auto cash out (optional)</p>
            <Input
              type="number"
              min={1.01}
              step="0.01"
              placeholder="e.g. 2.00"
              value={auto}
              disabled={busy || hasActiveBet || (!isBetting && !isCrashed)}
              onChange={(e) => setAuto(e.target.value)}
              className="h-11 bg-background font-bold"
            />
          </div>

          {/* Action Button state machine */}
          {isRunning && hasActiveBet ? (
            <>
              <StatBox
                label="Current value"
                value={<span className="text-success font-black">{fmt(me.wager * m)}</span>}
              />
              <Button
                variant="success"
                size="xl"
                className="w-full font-black text-base shadow-glow animate-pulse"
                disabled={busy}
                onClick={handleCashout}
              >
                {busy ? <Loader2 className="animate-spin" /> : `Cash Out @ ${m.toFixed(2)}×`}
              </Button>
            </>
          ) : currentPhase === "betting" && hasActiveBet ? (
            <div className="rounded-xl border border-success/40 bg-success/10 p-3.5 text-center">
              <p className="text-xs font-bold text-success flex items-center justify-center gap-1.5">
                <CheckCircle2 className="size-4" /> Bet Placed: {fmt(me.wager)} coins
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {me.auto ? `Auto Cashout set @ ${me.auto.toFixed(2)}×` : "Manual Cashout ready"}
              </p>
            </div>
          ) : isRunning ? (
            <Button variant="surface" size="xl" className="w-full font-bold opacity-60" disabled>
              Launch in progress...
            </Button>
          ) : (
            <Button
              variant="play"
              size="xl"
              className="w-full font-black shadow-glow"
              disabled={busy || !isBetting}
              onClick={handleBet}
            >
              {busy ? <Loader2 className="animate-spin" /> : isBetting ? "Place Bet" : "Waiting for Next Round"}
            </Button>
          )}

          <p className="text-[11px] text-muted-foreground">
            Synchronous multiplayer crash. All players ride the same rocket launch every round.
          </p>

          {/* Multiplayer Live Bets List */}
          <div className="mt-4 rounded-xl border border-border/80 bg-background/50 p-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2 text-xs font-bold text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5" /> {state?.bets?.length ?? 0} Players
              </span>
              <span>Multiplier / Win</span>
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1.5 no-scrollbar text-xs">
              {(state?.bets ?? []).length === 0 && (
                <p className="py-3 text-center text-muted-foreground text-[11px]">
                  No bets placed yet for this round
                </p>
              )}
              {(state?.bets ?? []).map((b) => (
                <div
                  key={b.userId}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2 py-1.5",
                    b.userId === userId ? "bg-primary/10 border border-primary/30" : "bg-surface"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar name={b.username} size={20} />
                    <span className="truncate font-semibold max-w-[110px]">{b.username}</span>
                  </div>
                  <div className="flex items-center gap-2 tabular text-right">
                    <Amount value={b.wager} compact className="text-muted-foreground" />
                    {b.settled && b.cashedAt ? (
                      <span className="rounded bg-success/20 px-1.5 py-0.5 font-bold text-success text-[11px]">
                        {b.cashedAt.toFixed(2)}×
                      </span>
                    ) : isCrashed ? (
                      <span className="text-destructive font-bold text-[11px]">Crashed</span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">...</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      }
    >
      <div className="flex h-full flex-col p-4">
        {/* Previous Rounds History Pills */}
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {(state?.history ?? []).map((h) => (
            <span
              key={h.seq}
              title={`Round #${h.seq} - Hash: ${h.hash.slice(0, 16)}...`}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-black tabular transition animate-pop-in cursor-default",
                h.crashPoint >= 2 ? "bg-success/20 text-success border border-success/30" : "bg-surface-2 text-muted-foreground border border-border"
              )}
            >
              {h.crashPoint.toFixed(2)}×
            </span>
          ))}
        </div>

        {/* Dynamic Rocket Arena */}
        <div className="relative mt-3 flex-1 overflow-hidden rounded-2xl border border-border bg-background shadow-inner">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            <defs>
              <linearGradient id="sharedcrashfill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[25, 50, 75].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="var(--border)" strokeWidth="0.3" strokeDasharray="1,1" />
            ))}
            {currentPhase !== "betting" && (
              <polygon points={`0,100 ${pts.join(" ")} ${last[0]},100`} fill="url(#sharedcrashfill)" />
            )}
            {currentPhase !== "betting" && (
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={isCrashed ? "var(--destructive)" : "var(--primary)"}
                strokeWidth="1.2"
                vectorEffect="non-scaling-stroke"
                style={{ strokeWidth: 4 }}
              />
            )}
          </svg>

          {/* Flying Rocket Icon */}
          {currentPhase !== "betting" && !isCrashed && (
            <Rocket
              className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rotate-45 text-primary drop-shadow-lg transition-all duration-75"
              style={{ left: `${Math.min(96, last[0])}%`, top: `${Math.max(4, last[1])}%` }}
            />
          )}

          {/* Multiplier / Phase State In Center */}
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              {currentPhase === "betting" ? (
                <div className="space-y-2 animate-fade-up">
                  <div className="grid size-16 mx-auto place-items-center rounded-2xl bg-accent/20 text-accent">
                    <Rocket className="size-8" />
                  </div>
                  <p className="font-display text-4xl sm:text-5xl tracking-wide text-foreground font-black">
                    {secondsToLaunch.toFixed(1)}s
                  </p>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Next Launch Preparation
                  </p>
                </div>
              ) : (
                <div className="animate-pop-in">
                  <p
                    className={cn(
                      "font-display text-[clamp(4rem,10vw,7.5rem)] leading-none tracking-tight font-black tabular",
                      isCrashed ? "text-destructive animate-shake" : hasWon ? "text-success" : "text-foreground"
                    )}
                  >
                    {m.toFixed(2)}×
                  </p>
                  {isCrashed && (
                    <p className="mt-2 text-lg font-black uppercase tracking-wider text-destructive">
                      Crashed @ {round?.crashPoint?.toFixed(2)}×
                    </p>
                  )}
                  {hasWon && (
                    <p className="mt-2 text-base font-bold text-success flex items-center justify-center gap-1.5">
                      <Sparkles className="size-4" /> Cashed out {fmt(me.payout)} coins!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
