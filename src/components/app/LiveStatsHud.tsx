import { useState, useEffect, useRef } from "react";
import { Activity, X, Minus, ChevronUp, RotateCcw, TrendingUp, TrendingDown, GripHorizontal, Coins, Award } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatPoint = { t: number; bal: number; profit: number };

export function LiveStatsHud() {
  const { balance, userId } = useApp();
  const [open, setOpen] = useState(() => localStorage.getItem("keno:livestats:open") !== "0");
  const [minimized, setMinimized] = useState(() => localStorage.getItem("keno:livestats:min") === "1");
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem("keno:livestats:pos");
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: 280, y: typeof window !== "undefined" ? Math.max(100, window.innerHeight - 380) : 400 };
  });

  // Session Stats
  const [sessionWagered, setSessionWagered] = useState(0);
  const [sessionPayout, setSessionPayout] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [history, setHistory] = useState<StatPoint[]>([]);

  const startBalance = useRef<number | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Initialize start balance
  useEffect(() => {
    if (balance > 0 && startBalance.current === null) {
      startBalance.current = balance;
      setHistory([{ t: Date.now(), bal: balance, profit: 0 }]);
    }
  }, [balance]);

  // Subscribe to live bets for active user
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`user-live-stats-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets", filter: `user_id=eq.${userId}` },
        (payload) => {
          const b = payload.new as { wager: number; payout: number };
          const wager = Number(b.wager) || 0;
          const payout = Number(b.payout) || 0;
          setSessionWagered((w) => w + wager);
          setSessionPayout((p) => p + payout);
          if (payout > wager) {
            setWins((w) => w + 1);
          } else {
            setLosses((l) => l + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  // Record balance swing
  useEffect(() => {
    if (startBalance.current === null) return;
    const profit = balance - startBalance.current;
    setHistory((prev) => {
      const next = [...prev, { t: Date.now(), bal: balance, profit }];
      if (next.length > 40) return next.slice(next.length - 40);
      return next;
    });
  }, [balance]);

  const resetSession = () => {
    startBalance.current = balance;
    setSessionWagered(0);
    setSessionPayout(0);
    setWins(0);
    setLosses(0);
    setHistory([{ t: Date.now(), bal: balance, profit: 0 }]);
  };

  const toggleOpen = (val: boolean) => {
    setOpen(val);
    localStorage.setItem("keno:livestats:open", val ? "1" : "0");
  };

  const toggleMin = () => {
    setMinimized((m) => {
      localStorage.setItem("keno:livestats:min", !m ? "1" : "0");
      return !m;
    });
  };

  // Drag logic
  const handlePointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const maxX = window.innerWidth - 300;
    const maxY = window.innerHeight - 100;
    const nextX = Math.min(Math.max(10, e.clientX - dragOffset.current.x), Math.max(10, maxX));
    const nextY = Math.min(Math.max(10, e.clientY - dragOffset.current.y), Math.max(10, maxY));
    setPos({ x: nextX, y: nextY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    localStorage.setItem("keno:livestats:pos", JSON.stringify(pos));
  };

  const netProfit = sessionPayout - sessionWagered;
  const isUp = netProfit >= 0;
  const totalBets = wins + losses;
  const winRate = totalBets > 0 ? ((wins / totalBets) * 100).toFixed(1) : "0.0";

  // Build SVG Sparkline path
  const points = history.length > 1 ? history : [{ t: 1, bal: balance, profit: 0 }, { t: 2, bal: balance, profit: 0 }];
  const profits = points.map((p) => p.profit);
  const minP = Math.min(0, ...profits);
  const maxP = Math.max(0, ...profits);
  const range = maxP - minP || 1;
  const W = 260;
  const H = 64;

  const sparkCoords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * W;
    const y = H - 8 - ((p.profit - minP) / range) * (H - 16);
    return [x, y];
  });

  const polylineStr = sparkCoords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaStr = `${polylineStr} ${W},${H} 0,${H}`;

  if (!open) {
    return (
      <button
        onClick={() => toggleOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl border border-primary/40 bg-surface/90 px-3.5 py-2 text-xs font-bold text-foreground shadow-2xl backdrop-blur-xl transition hover:border-primary hover:scale-105 active:scale-95"
      >
        <Activity className="size-4 text-primary animate-pulse" />
        <span>Live Stats HUD</span>
        {netProfit !== 0 && (
          <span className={cn("font-mono text-[11px] font-black", isUp ? "text-success" : "text-destructive")}>
            {isUp ? "+" : ""}{fmtCompact(netProfit)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-50 w-72 select-none overflow-hidden rounded-2xl border border-border/80 bg-background/95 shadow-2xl backdrop-blur-2xl animate-fade-up"
    >
      {/* Header / Drag Handle */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex cursor-move items-center justify-between border-b border-border/60 bg-surface/80 px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="size-3.5 text-muted-foreground opacity-60" />
          <span className="flex items-center gap-1.5 text-xs font-black tracking-wide uppercase text-foreground">
            <Activity className="size-3.5 text-primary" /> Live Stats
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={resetSession}
            title="Reset Session Stats"
            className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            onClick={toggleMin}
            title={minimized ? "Expand" : "Minimize"}
            className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition"
          >
            {minimized ? <ChevronUp className="size-3.5" /> : <Minus className="size-3.5" />}
          </button>
          <button
            onClick={() => toggleOpen(false)}
            title="Close"
            className="rounded p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Stats Body */}
      {!minimized && (
        <div className="p-3 space-y-3">
          {/* Profit / Loss Big Display */}
          <div className="flex items-center justify-between rounded-xl bg-surface-2/60 p-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session Profit</p>
              <p className={cn("font-mono text-base font-black tracking-tight", isUp ? "text-success" : "text-destructive")}>
                {isUp ? "+" : ""}{fmt(netProfit)}
              </p>
            </div>
            <div className={cn("grid size-9 place-items-center rounded-xl", isUp ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive")}>
              {isUp ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
            </div>
          </div>

          {/* Real-time Sparkline Graph */}
          <div className="relative rounded-xl border border-border/60 bg-background/50 p-1.5 overflow-hidden">
            <div className="flex items-center justify-between px-1.5 text-[9px] font-bold uppercase text-muted-foreground">
              <span>Balance Trajectory</span>
              <span className={cn(isUp ? "text-success" : "text-destructive")}>
                {isUp ? "▲ Positive" : "▼ Drawdown"}
              </span>
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="h-16 w-full overflow-visible mt-1">
              <defs>
                <linearGradient id="sparkGradWin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="sparkGradLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Zero midline */}
              {minP < 0 && maxP > 0 && (
                <line
                  x1="0"
                  y1={H - 8 - ((0 - minP) / range) * (H - 16)}
                  x2={W}
                  y2={H - 8 - ((0 - minP) / range) * (H - 16)}
                  stroke="rgba(255,255,255,0.12)"
                  strokeDasharray="3 3"
                />
              )}

              {/* Area fill */}
              <polygon points={areaStr} fill={isUp ? "url(#sparkGradWin)" : "url(#sparkGradLoss)"} />

              {/* Path stroke */}
              <polyline
                points={polylineStr}
                fill="none"
                stroke={isUp ? "#10b981" : "#ef4444"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Current head dot */}
              {sparkCoords.length > 0 && (
                <circle
                  cx={sparkCoords[sparkCoords.length - 1][0]}
                  cy={sparkCoords[sparkCoords.length - 1][1]}
                  r="3.5"
                  fill={isUp ? "#10b981" : "#ef4444"}
                  className="animate-ping"
                />
              )}
            </svg>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-surface-2/40 p-2 border border-border/40">
              <p className="text-[10px] text-muted-foreground font-semibold">Wagered</p>
              <p className="font-mono font-bold text-foreground mt-0.5">{fmtCompact(sessionWagered)}</p>
            </div>
            <div className="rounded-xl bg-surface-2/40 p-2 border border-border/40">
              <p className="text-[10px] text-muted-foreground font-semibold">Win Rate ({wins}W / {losses}L)</p>
              <p className="font-mono font-bold text-foreground mt-0.5">{winRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
