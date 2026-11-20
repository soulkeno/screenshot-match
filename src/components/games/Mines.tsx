import { useState, useEffect, useRef, type PointerEvent as RPointerEvent, type MouseEvent as RMouseEvent } from "react";
import { Shuffle, Play, Square, Gem, ChevronDown } from "lucide-react";
import { GameLayout, StatBox, ResultToast } from "./GameLayout";
import { useBetAmount, useSession } from "./useGame";
import { getAdvancedSettings } from "./AdvancedGameSettings";
import { Button } from "@/components/ui/button";
import { minesMultiplier } from "@/lib/games/logic";
import { sfx } from "@/lib/sound";
import { fmt, fmtCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Coin } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";

type GridDim = 16 | 25 | 36 | 49 | 64;

const GRID_OPTIONS: { label: string; value: GridDim; cols: number; classCols: string }[] = [
  { label: "4x4", value: 16, cols: 4, classCols: "grid-cols-4" },
  { label: "5x5", value: 25, cols: 5, classCols: "grid-cols-5" },
  { label: "6x6", value: 36, cols: 6, classCols: "grid-cols-6" },
  { label: "7x7", value: 49, cols: 7, classCols: "grid-cols-7" },
  { label: "8x8", value: 64, cols: 8, classCols: "grid-cols-8" },
];

export default function Mines() {
  const { wallet } = useApp();
  const [mode, setMode] = useState<"manual" | "auto">("manual");
  const [bet, setBet] = useBetAmount("mines");
  const [gridSize, setGridSize] = useState<GridDim>(25);
  const [mines, setMines] = useState(3);
  const { session, busy, begin, action, active } = useSession("mines");
  const [pending, setPending] = useState<number | null>(null);

  // Auto mode settings
  const [autoPicks, setAutoPicks] = useState<number[]>([0, 1, 2]);
  const [autoBets, setAutoBets] = useState("10");
  const [autoRunning, setAutoRunning] = useState(false);
  const autoRunningRef = useRef(false);

  const totalTiles = active ? (session.totalTiles || 25) : gridSize;
  const currentGridOption = GRID_OPTIONS.find((g) => g.value === totalTiles) || GRID_OPTIONS[1];
  const maxMines = totalTiles - 1;
  const safeMines = Math.min(maxMines, Math.max(1, mines));
  const m = active ? session.mines : safeMines;
  const safeTilesCount = totalTiles - m;

  const revealed: number[] = session?.revealed ?? [];
  const minePos: number[] = session?.minePositions ?? [];
  const ended = session && session.status !== "active";

  // Calculate projected payout on win
  const expectedPicks = mode === "auto" ? Math.max(1, autoPicks.length) : Math.max(1, revealed.length || 1);
  const projectedMult = minesMultiplier(m, Math.min(expectedPicks, safeTilesCount), totalTiles);
  const payoutOnWin = (Number(bet) * projectedMult).toFixed(2);

  // Manual start
  async function start() {
    const r = await begin(Number(bet), { mines: safeMines, gridSize });
    if (r) sfx.bet();
  }

  // Reveals are queued so dragging across many tiles sends them one at a time, in order.
  const revealQueue = useRef<number[]>([]);
  const queueRunning = useRef(false);
  const [queued, setQueued] = useState<number[]>([]);
  const liveRef = useRef({ active, revealed: [] as number[] });
  liveRef.current = { active, revealed: session?.revealed ?? [] };

  async function processQueue() {
    if (queueRunning.current) return;
    queueRunning.current = true;
    while (revealQueue.current.length > 0) {
      const t = revealQueue.current.shift()!;
      setQueued([...revealQueue.current]);
      setPending(t);
      sfx.gem();
      const r = await action("reveal", { tile: t });
      setPending(null);
      if (!r || r.session.status !== "active") {
        if (r?.session.status === "lost") sfx.boom();
        else if (r?.session.status === "won") setTimeout(sfx.win, 150);
        revealQueue.current = [];
        setQueued([]);
        break;
      }
    }
    queueRunning.current = false;
  }

  function reveal(t: number) {
    const live = liveRef.current;
    if (!live.active || live.revealed.includes(t) || revealQueue.current.includes(t) || pending === t) return;
    revealQueue.current.push(t);
    setQueued([...revealQueue.current]);
    void processQueue();
  }

  // Drag across tiles: in a round it reveals each tile, in Auto setup it selects/unselects.
  const drag = useRef<{ on: boolean; kind: "reveal" | "add" | "remove"; seen: Set<number> }>({ on: false, kind: "reveal", seen: new Set() });

  function applyTile(i: number, first: boolean) {
    const d = drag.current;
    if (d.seen.has(i)) return;
    d.seen.add(i);
    if (mode === "auto" && !active && !autoRunning) {
      setAutoPicks((prev) => {
        if (first) d.kind = prev.includes(i) ? "remove" : "add";
        if (d.kind === "remove") return prev.filter((p) => p !== i);
        if (prev.includes(i) || prev.length >= safeTilesCount) return prev;
        return [...prev, i];
      });
      return;
    }
    if (mode === "manual") reveal(i);
  }

  function tileAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest("[data-tile]") as HTMLElement | null;
    if (!el || el.hasAttribute("disabled")) return null;
    return Number(el.dataset["tile"]);
  }

  function onGridPointerDown(e: RPointerEvent) {
    if (e.button !== 0) return;
    const i = tileAt(e.clientX, e.clientY);
    if (i === null) return;
    e.preventDefault();
    drag.current = { on: true, kind: "reveal", seen: new Set() };
    applyTile(i, true);
  }

  function onGridPointerMove(e: RPointerEvent) {
    if (!drag.current.on) return;
    const i = tileAt(e.clientX, e.clientY);
    if (i !== null) applyTile(i, false);
  }

  useEffect(() => {
    const end = () => { drag.current.on = false; };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  async function cashout() {
    revealQueue.current = [];
    setQueued([]);
    const r = await action("cashout");
    if (r) sfx.cashout();
  }

  function randomPick() {
    const free = Array.from({ length: totalTiles }, (_, i) => i).filter((i) => !revealed.includes(i) && !revealQueue.current.includes(i));
    if (free.length > 0) {
      reveal(free[Math.floor(Math.random() * free.length)]);
    }
  }

  // Auto play runner
  async function startAuto() {
    if (autoPicks.length === 0) return;
    setAutoRunning(true);
    autoRunningRef.current = true;
    let roundsLeft = Math.max(1, parseInt(autoBets) || 10);

    while (roundsLeft > 0 && autoRunningRef.current) {
      const startRes = await begin(Number(bet), { mines: safeMines, gridSize });
      if (!startRes) break;
      sfx.bet();

      let lost = false;
      for (const tile of autoPicks) {
        if (!autoRunningRef.current) break;
        await new Promise((res) => setTimeout(res, 120));
        const revRes = await action("reveal", { tile });
        if (!revRes || revRes.session.status === "lost") {
          lost = true;
          sfx.boom();
          break;
        }
      }

      if (!lost && autoRunningRef.current) {
        await new Promise((res) => setTimeout(res, 100));
        await action("cashout");
        sfx.cashout();
      }

      roundsLeft--;
      await new Promise((res) => setTimeout(res, 350));
    }

    setAutoRunning(false);
    autoRunningRef.current = false;
  }

  function stopAuto() {
    autoRunningRef.current = false;
    setAutoRunning(false);
  }

  // Hotkeys
  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const adv = getAdvancedSettings();
      if (!adv.hotkeys) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (active && revealed.length > 0) cashout();
        else if (!active && !busy && mode === "manual") start();
      } else if (e.key === "c" || e.key === "C") {
        if (active && revealed.length > 0) cashout();
      }
    };
    window.addEventListener("keydown", handleDown);
    return () => window.removeEventListener("keydown", handleDown);
  }, [active, revealed.length, start, cashout, busy, mode]);

  return (
    <GameLayout slug="mines" controls={
      <div className="space-y-4">
        {/* Manual / Auto Tab Buttons (Matching Screenshot) */}
        <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 border border-border/50">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className={cn(
              "py-2 text-xs font-black tracking-wide rounded-lg transition-all",
              mode === "manual" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setMode("auto")}
            className={cn(
              "py-2 text-xs font-black tracking-wide rounded-lg transition-all",
              mode === "auto" ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Auto
          </button>
        </div>

        {/* Bet Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Bet Amount</label>
          <div className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 border border-border/60 focus-within:border-primary">
            <Coin className="size-4 shrink-0" />
            <input
              type="number"
              step="1"
              min="1"
              disabled={active || busy || autoRunning}
              value={bet}
              onChange={(e) => setBet(e.target.value)}
              className="w-full bg-transparent text-sm font-mono font-bold text-foreground focus:outline-none"
            />
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={active || busy || autoRunning}
                onClick={() => setBet(String(Math.max(1, Math.floor(Number(bet) / 2))))}
                className="rounded bg-surface px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                1/2
              </button>
              <button
                type="button"
                disabled={active || busy || autoRunning}
                onClick={() => setBet(String(Math.floor(Number(bet) * 2)))}
                className="rounded bg-surface px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                x2
              </button>
              <button
                type="button"
                disabled={active || busy || autoRunning}
                onClick={() => wallet?.balance && setBet(String(Math.floor(wallet.balance)))}
                className="rounded bg-surface px-2 py-1 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Max
              </button>
            </div>
          </div>
        </div>

        {/* Payout on win */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Payout on win</label>
          <div className="flex items-center gap-2 rounded-xl bg-surface-2/80 px-3 py-2.5 border border-border/40">
            <Coin className="size-4 shrink-0" />
            <span className="text-sm font-mono font-bold text-foreground">
              {active ? fmt(Number(session.wager) * session.multiplier) : payoutOnWin}
            </span>
          </div>
        </div>

        {/* Grid Size Configurator */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-muted-foreground">Grid Size</label>
          <div className="relative">
            <select
              disabled={active || busy || autoRunning}
              value={gridSize}
              onChange={(e) => {
                const s = Number(e.target.value) as GridDim;
                setGridSize(s);
                if (mines >= s) setMines(Math.max(1, Math.floor(s / 5)));
                setAutoPicks([]);
              }}
              className="w-full appearance-none rounded-xl bg-surface-2 px-3 py-2.5 text-xs font-bold text-foreground border border-border/60 focus:outline-none focus:border-primary pr-8 cursor-pointer disabled:opacity-50"
            >
              {GRID_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-popover text-foreground">
                  {opt.label} ({opt.value} tiles)
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 size-4 text-muted-foreground" />
          </div>
        </div>

        {/* Number of Mines Slider with Badges */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">Number of Mines</label>
          <div className="flex items-center gap-3">
            {/* Red Badge for Mines */}
            <div className="flex items-center gap-1 rounded-lg bg-red-950/80 px-2.5 py-1.5 border border-red-800/60 text-red-400 font-bold text-xs shrink-0">
              <span className="text-red-500 font-black">♦</span>
              <span>{m}</span>
            </div>

            {/* Slider bar with circle thumb */}
            <input
              type="range"
              min={1}
              max={maxMines}
              value={m}
              disabled={active || busy || autoRunning}
              onChange={(e) => setMines(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-surface-2 rounded-lg cursor-pointer disabled:opacity-50"
            />

            {/* Green Badge for Safe Gems */}
            <div className="flex items-center gap-1 rounded-lg bg-emerald-950/80 px-2.5 py-1.5 border border-emerald-800/60 text-emerald-400 font-bold text-xs shrink-0">
              <span>{safeTilesCount}</span>
              <span className="text-emerald-400 font-black">♦</span>
            </div>
          </div>
        </div>

        {/* Auto Mode Configuration */}
        {mode === "auto" && (
          <div className="space-y-2 rounded-xl bg-surface-2/40 p-3 border border-border/60">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Selected Tiles: {autoPicks.length}</span>
              <span className="text-muted-foreground text-[11px]">(Click or drag over tiles)</span>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Number of Bets</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={autoBets}
                disabled={autoRunning}
                onChange={(e) => setAutoBets(e.target.value)}
                className="w-full rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-mono font-bold text-foreground border border-border/50 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {mode === "manual" ? (
          active ? (
            <div className="space-y-2">
              <StatBox
                label="Profit"
                value={<span className="text-success">+{fmt(Number(session.wager) * session.multiplier - Number(session.wager))}</span>}
              />
              <Button variant="surface" className="w-full" disabled={busy} onClick={randomPick}>
                <Shuffle className="size-4" /> Pick random tile
              </Button>
              <Button
                variant="success"
                size="xl"
                className="w-full"
                disabled={busy || revealed.length === 0}
                onClick={cashout}
              >
                Cash out {fmt(Number(session.wager) * session.multiplier)}
              </Button>
            </div>
          ) : (
            <Button variant="play" size="xl" className="w-full" disabled={busy} onClick={start}>
              Bet
            </Button>
          )
        ) : (
          autoRunning ? (
            <Button variant="destructive" size="xl" className="w-full" onClick={stopAuto}>
              <Square className="size-4" /> Stop Auto
            </Button>
          ) : (
            <Button
              variant="play"
              size="xl"
              className="w-full"
              disabled={busy || autoPicks.length === 0}
              onClick={startAuto}
            >
              <Play className="size-4" /> Start Auto ({autoPicks.length} tiles)
            </Button>
          )
        )}
      </div>
    }>
      <div className="grid h-full place-items-center p-4 md:p-8">
        <div className="relative w-full max-w-[560px]">
          <div
            className={cn("grid gap-2 md:gap-2.5 select-none", currentGridOption.classCols, (active || (mode === "auto" && !autoRunning)) && "touch-none")}
            onPointerDown={onGridPointerDown}
            onPointerMove={onGridPointerMove}
          >
            {Array.from({ length: totalTiles }, (_, i) => {
              const isRev = revealed.includes(i);
              const isMine = ended && minePos.includes(i);
              const hit = session?.hit === i;
              const showGem = isRev || (ended && !minePos.includes(i));
              const isAutoSelected = mode === "auto" && !active && autoPicks.includes(i);

              // Mouse/touch are handled by the grid's drag handlers; this keeps keyboard (Enter/Space) working.
              const handleTileClick = (e: RMouseEvent) => {
                if (e.detail !== 0) return;
                drag.current = { on: false, kind: "reveal", seen: new Set() };
                applyTile(i, true);
              };

              return (
                <button
                  key={i}
                  data-tile={i}
                  onClick={handleTileClick}
                  disabled={(!active && mode === "manual") || (active && isRev)}
                  className={cn(
                    "relative aspect-square rounded-xl transition-all duration-200",
                    !isRev && !ended && !isAutoSelected && "bg-surface-2 shadow-press hover:-translate-y-1 hover:bg-muted",
                    isAutoSelected && "bg-amber-500/20 ring-2 ring-amber-500 shadow-md",
                    active && !isRev && "cursor-pointer",
                    isRev && "bg-background ring-2 ring-success/60",
                    ended && !isRev && "bg-background",
                    hit && "bg-destructive/25 ring-2 ring-destructive",
                    (pending === i || queued.includes(i)) && "animate-pulse ring-2 ring-primary/50"
                  )}
                >
                  {isAutoSelected && !active && !ended && (
                    <span className="absolute inset-0 grid place-items-center">
                      <Gem className="size-5 text-amber-400 animate-pulse" />
                    </span>
                  )}
                  {(showGem || isMine) && (
                    <span className={cn("absolute inset-0 grid place-items-center animate-pop-in", ended && !isRev && !hit && "opacity-40")}>
                      {isMine ? (
                        <img
                          src="/mines-bomb.png"
                          alt="Bomb"
                          className={cn(
                            "size-[65%] object-contain drop-shadow-[0_4px_10px_rgba(239,68,68,0.7)] animate-pop-in",
                            hit && "animate-shake scale-110"
                          )}
                        />
                      ) : (
                        <img
                          src="/mines-gem.png"
                          alt="Gem"
                          className="size-[65%] object-contain drop-shadow-[0_4px_10px_rgba(250,204,21,0.8)] animate-pop-in"
                        />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {ended && session.status === "won" && (
            <ResultToast win mult={session.payout / session.wager} payout={session.payout} />
          )}
        </div>
      </div>
    </GameLayout>
  );
}
