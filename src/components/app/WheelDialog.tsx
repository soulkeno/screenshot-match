import { useEffect, useRef, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Trophy, Zap, Gift, Clock, Loader2, Coins, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coin, Amount } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { rankProgress } from "@/lib/ranks";
import { WHEELS, WHEEL_COOLDOWN_MS, wheelTierFor, type WheelTier, type WheelPrize } from "@/lib/rewards";
import { spinWheelFn } from "@/lib/games.functions";
import { sfx } from "@/lib/sound";
import { errMsg, fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

// Luxurious slice gradient definitions for high-end look
const SLICE_THEMES = [
  { fill1: "#6366f1", fill2: "#4338ca", border: "#818cf8", text: "#ffffff" }, // Indigo
  { fill1: "#ec4899", fill2: "#be185d", border: "#f472b6", text: "#ffffff" }, // Pink
  { fill1: "#06b6d4", fill2: "#0e7490", border: "#22d3ee", text: "#ffffff" }, // Cyan
  { fill1: "#10b981", fill2: "#047857", border: "#34d399", text: "#ffffff" }, // Emerald
  { fill1: "#f59e0b", fill2: "#b45309", border: "#fbbf24", text: "#ffffff" }, // Amber
  { fill1: "#8b5cf6", fill2: "#6d28d9", border: "#a78bfa", text: "#ffffff" }, // Purple
  { fill1: "#f43f5e", fill2: "#be123c", border: "#fb7185", text: "#ffffff" }, // Rose
  { fill1: "#eab308", fill2: "#a16207", border: "#fde047", text: "#ffffff" }, // Gold
];

export function WheelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, userId, setBalance, refresh } = useApp();
  const spinFn = useServerFn(spinWheelFn);

  const prog = rankProgress(profile?.total_wagered);
  const myTier = wheelTierFor(prog.cur.index);
  const [selectedTier, setSelectedTier] = useState<WheelTier>(myTier);

  // Sync selected tier with user rank
  useEffect(() => {
    setSelectedTier(myTier);
  }, [myTier]);

  const wheelDef = WHEELS[selectedTier];
  const slices = wheelDef.prizes;

  // Animation and spin state
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<{ label: string; kind: string; cosmetic?: string | null } | null>(null);
  const [lastSpinTime, setLastSpinTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Clock for cooldown timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch last spin time from wallet or storage
  useEffect(() => {
    if (!userId || !open) return;
    const key = `keno:last_spin:${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      setLastSpinTime(Number(stored));
    }
  }, [userId, open]);

  const timeRemaining = useMemo(() => {
    if (!lastSpinTime) return 0;
    const nextSpinAt = lastSpinTime + WHEEL_COOLDOWN_MS;
    return Math.max(0, nextSpinAt - now);
  }, [lastSpinTime, now]);

  const canSpin = timeRemaining <= 0 && !spinning && selectedTier === myTier;

  const formattedCountdown = useMemo(() => {
    const totalSec = Math.floor(timeRemaining / 1000);
    const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
    const s = String(totalSec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, [timeRemaining]);

  async function handleSpin() {
    if (!canSpin) return;
    setSpinning(true);
    setWonPrize(null);

    try {
      const res = await spinFn();
      if (typeof res?.balance === "number") {
        setBalance(res.balance);
      }

      // Slices: 8 slices = 45 degrees per slice.
      const sliceIdx = res.slice ?? 0;
      const sliceAngle = 360 / slices.length;
      // In SVG: slice 0 starts at 0 deg (top-right from -90)
      const targetCenter = 360 - (sliceIdx + 0.5) * sliceAngle;

      // 6 full 360 rotations for realistic momentum
      const fullRotations = 360 * 6;
      const finalRotation = rotation + fullRotations + (targetCenter - (rotation % 360));

      setRotation(finalRotation);

      // Play click ticking sounds during spin
      let clicks = 0;
      const clickInterval = setInterval(() => {
        clicks++;
        try {
          sfx.click();
        } catch {}
        if (clicks >= 26) clearInterval(clickInterval);
      }, 160);

      // Animation duration: 4.5s
      setTimeout(() => {
        clearInterval(clickInterval);
        setSpinning(false);
        setWonPrize({ label: res.label, kind: res.kind, cosmetic: res.cosmetic });
        const nowTs = Date.now();
        setLastSpinTime(nowTs);
        if (userId) localStorage.setItem(`keno:last_spin:${userId}`, String(nowTs));
        try {
          sfx.win();
        } catch {}
        toast.success(`🎉 You won: ${res.label}!`);
        void refresh();
      }, 4500);
    } catch (e) {
      setSpinning(false);
      toast.error(errMsg(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover max-w-lg max-h-[92vh] overflow-y-auto p-0 flex flex-col no-scrollbar shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border text-center sm:text-left bg-gradient-to-r from-surface-2 to-surface">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2.5 text-xl font-black uppercase tracking-wide">
              <Sparkles className="size-5 text-gold animate-bounce" /> Daily Lucky Wheel
            </DialogTitle>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-gold/40 bg-gold/10 text-gold">
              Free 24h Spin
            </span>
          </div>
          <DialogDescription className="text-xs">
            Spin every 24 hours to win free Coins, Rakeback Boosters, and rare Cosmetics!
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center">
          {/* Wheel Tier Selector */}
          <div className="flex gap-2 p-1 rounded-xl border border-border bg-surface mb-6 w-full max-w-sm justify-center shadow-inner">
            {(["bronze", "gold", "diamond"] as const).map((t) => {
              const def = WHEELS[t];
              const unlocked = prog.cur.index >= def.minRank;
              const isSelected = selectedTier === t;
              return (
                <button
                  key={t}
                  disabled={spinning}
                  onClick={() => setSelectedTier(t)}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all text-center flex items-center justify-center gap-1.5",
                    isSelected
                      ? t === "diamond"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg ring-1 ring-cyan-300"
                        : t === "gold"
                          ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-primary-foreground shadow-lg ring-1 ring-amber-300"
                          : "bg-surface-2 text-foreground ring-1 ring-primary/40 shadow-md"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{t}</span>
                  {!unlocked && <span className="text-[10px] opacity-75">🔒</span>}
                </button>
              );
            })}
          </div>

          {/* Interactive Wheel Graphic Container */}
          <div className="relative size-72 sm:size-84 flex items-center justify-center select-none my-2">
            {/* Ambient Lighting Rays */}
            <div className="absolute inset-0 rounded-full blur-2xl opacity-20 bg-gradient-to-tr from-gold via-accent to-primary pointer-events-none" />

            {/* Pointer / Flapper Arrow at Top Center */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] pointer-events-none">
              <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
                <path
                  d="M18 42L4 12C2 8 5 3 10 3H26C31 3 34 8 32 12L18 42Z"
                  fill="url(#pointerGoldGrad)"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                />
                <circle cx="18" cy="14" r="4" fill="#ffffff" />
                <defs>
                  <linearGradient id="pointerGoldGrad" x1="18" y1="3" x2="18" y2="42" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fef08a" />
                    <stop offset="0.5" stopColor="#eab308" />
                    <stop offset="1" stopColor="#a16207" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Golden Beveled Outer Rim with Glowing Bulbs */}
            <div className="absolute inset-0 rounded-full border-8 border-amber-500/80 shadow-[0_0_35px_rgba(234,179,8,0.35),inset_0_0_15px_rgba(0,0,0,0.8)] pointer-events-none z-20">
              {/* Rim Stud Lights */}
              {Array.from({ length: 16 }).map((_, i) => {
                const ang = (i * 360) / 16;
                const rad = (ang * Math.PI) / 180;
                const r = 48.5; // percent
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={i}
                    className="absolute size-2 rounded-full -translate-x-1/2 -translate-y-1/2 bg-yellow-100 shadow-[0_0_6px_#fef08a]"
                    style={{ left: `${x}%`, top: `${y}%` }}
                  />
                );
              })}
            </div>

            {/* Rotating Wheel Disc */}
            <div
              className="relative size-full rounded-full overflow-hidden shadow-2xl transition-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? "4.5s" : "0s",
                transitionTimingFunction: "cubic-bezier(0.12, 0.95, 0.22, 1)",
              }}
            >
              <svg viewBox="0 0 300 300" className="size-full">
                <defs>
                  {slices.map((_, i) => {
                    const theme = SLICE_THEMES[i % SLICE_THEMES.length];
                    return (
                      <linearGradient key={`grad-${i}`} id={`slice-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={theme.fill1} />
                        <stop offset="100%" stopColor={theme.fill2} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {slices.map((slice, i) => {
                  const angle = 360 / slices.length;
                  const startAngle = i * angle;
                  const endAngle = (i + 1) * angle;

                  const startRad = ((startAngle - 90) * Math.PI) / 180;
                  const endRad = ((endAngle - 90) * Math.PI) / 180;
                  const x1 = 150 + 150 * Math.cos(startRad);
                  const y1 = 150 + 150 * Math.sin(startRad);
                  const x2 = 150 + 150 * Math.cos(endRad);
                  const y2 = 150 + 150 * Math.sin(endRad);

                  const midAngle = startAngle + angle / 2;
                  const midRad = ((midAngle - 90) * Math.PI) / 180;
                  const textX = 150 + 96 * Math.cos(midRad);
                  const textY = 150 + 96 * Math.sin(midRad);

                  const theme = SLICE_THEMES[i % SLICE_THEMES.length];

                  return (
                    <g key={i}>
                      {/* Wedge Slice with Bevel Gradient */}
                      <path
                        d={`M150,150 L${x1},${y1} A150,150 0 0,1 ${x2},${y2} Z`}
                        fill={`url(#slice-grad-${i})`}
                        stroke="#0f172a"
                        strokeWidth="2"
                      />

                      {/* Slice Border Accent Line */}
                      <line
                        x1="150"
                        y1="150"
                        x2={x2}
                        y2={y2}
                        stroke="rgba(255,255,255,0.25)"
                        strokeWidth="1.5"
                      />

                      {/* Prize Label with Crisp Shadow */}
                      <text
                        x={textX}
                        y={textY}
                        fill="#ffffff"
                        fontSize="13"
                        fontWeight="900"
                        fontFamily="ui-sans-serif, system-ui, sans-serif"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                        style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.9))" }}
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center Chrome & Gold Hub with Faceted Star */}
            <div className="absolute size-20 rounded-full z-20 flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.8)] border-4 border-amber-400 bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900">
              <div className="size-12 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 flex items-center justify-center shadow-inner border border-white/40">
                <Sparkles className="size-6 text-slate-950 fill-current animate-spin" style={{ animationDuration: "12s" }} />
              </div>
            </div>
          </div>

          {/* Action / Spin Button & Cooldown */}
          <div className="w-full max-w-sm mt-5 space-y-3">
            {selectedTier !== myTier ? (
              <div className="rounded-xl border border-border bg-surface p-3 text-center text-xs text-muted-foreground">
                <p className="font-bold text-foreground">
                  {WHEELS[selectedTier].name} unlocks at rank level {WHEELS[selectedTier].minRank}
                </p>
                <p className="mt-0.5">Wager more coins to unlock upgraded wheel tiers!</p>
              </div>
            ) : canSpin ? (
              <Button
                variant="play"
                size="xl"
                disabled={spinning}
                onClick={handleSpin}
                className="w-full text-base font-black uppercase tracking-wider shadow-glow animate-pulse"
              >
                {spinning ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin" /> Spinning...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-5" /> Spin Lucky Wheel
                  </span>
                )}
              </Button>
            ) : (
              <div className="rounded-xl border border-border bg-surface/80 p-3.5 text-center text-xs space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-1.5">
                  <Clock className="size-3.5 text-accent" /> Next Free Spin In
                </p>
                <p className="text-xl font-black font-mono tracking-tight text-primary tabular">
                  {formattedCountdown}
                </p>
              </div>
            )}

            {wonPrize && (
              <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-center animate-pop-in">
                <p className="text-xs font-bold text-success flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="size-4" /> You won {wonPrize.label}!
                </p>
                {wonPrize.cosmetic && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cosmetic unlocked: <strong>{wonPrize.cosmetic}</strong> (check your Cosmetics locker)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
