import { useEffect, useRef, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, Trophy, Zap, Gift, Clock, Loader2, Coins, ArrowRight, ShieldCheck } from "lucide-react";
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

// 8 distinct vibrant slice colors
const SLICE_COLORS = [
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#eab308", // Gold
];

export function WheelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, userId, setBalance } = useApp();
  const spinFn = useServerFn(spinWheelFn);

  const prog = rankProgress(profile?.total_wagered);
  const myTier = wheelTierFor(prog.cur.level);
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

  // Fetch last spin time from wallet
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

      // Calculate target angle
      // Slices: 8 slices = 45 degrees per slice.
      // Top pointer is at 0 degrees / 360 degrees.
      // Slice i spans [i * 45, (i + 1) * 45]. Center of slice i is (i + 0.5) * 45.
      // To bring slice i to the top (0 deg), we rotate by: 360 - (i + 0.5) * 45.
      const sliceIdx = res.slice ?? 0;
      const sliceAngle = 360 / slices.length;
      const targetCenter = 360 - (sliceIdx + 0.5) * sliceAngle;

      // Add 5 to 7 full 360 rotations for realistic momentum
      const fullRotations = 360 * 6;
      const finalRotation = rotation + fullRotations + (targetCenter - (rotation % 360));

      setRotation(finalRotation);

      // Play click sounds during spin
      let clicks = 0;
      const clickInterval = setInterval(() => {
        clicks++;
        try {
          sfx.click();
        } catch {}
        if (clicks >= 25) clearInterval(clickInterval);
      }, 150);

      // After animation completes (4.5s)
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
        toast.success(`You won: ${res.label}! 🎉`);
      }, 4500);
    } catch (e) {
      setSpinning(false);
      toast.error(errMsg(e));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover max-w-lg max-h-[92vh] overflow-y-auto p-0 flex flex-col no-scrollbar">
        <DialogHeader className="p-6 pb-2 border-b border-border text-center sm:text-left">
          <DialogTitle className="flex items-center justify-center sm:justify-start gap-2.5 text-2xl font-black uppercase tracking-wide">
            <Sparkles className="size-6 text-gold animate-bounce" /> Daily Lucky Wheel
          </DialogTitle>
          <DialogDescription>
            Spin every 24 hours for free Coins, Rakeback Boosters, and rare Cosmetics. Higher ranks unlock upgraded wheels!
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col items-center">
          {/* Wheel Tier Tabs */}
          <div className="flex gap-1.5 p-1 rounded-xl border border-border bg-surface mb-6 w-full max-w-sm justify-center">
            {(["bronze", "gold", "diamond"] as const).map((t) => {
              const def = WHEELS[t];
              const unlocked = prog.cur.level >= def.minRank;
              const isSelected = selectedTier === t;
              return (
                <button
                  key={t}
                  disabled={spinning}
                  onClick={() => setSelectedTier(t)}
                  className={cn(
                    "flex-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1",
                    isSelected
                      ? t === "diamond"
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md"
                        : t === "gold"
                          ? "bg-gradient-gold text-primary-foreground shadow-md"
                          : "bg-surface-2 text-foreground ring-1 ring-primary/40 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="capitalize">{t}</span>
                  {!unlocked && <span className="text-[10px] opacity-60">🔒</span>}
                </button>
              );
            })}
          </div>

          {/* Interactive 3D Spinning Wheel Canvas */}
          <div className="relative size-72 sm:size-80 flex items-center justify-center select-none">
            {/* Pointer / Flapper Arrow at the top center */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]">
              <svg width="34" height="42" viewBox="0 0 34 42" fill="none">
                <path
                  d="M17 40L4 10C2 6 5 2 9 2H25C29 2 32 6 30 10L17 40Z"
                  fill="url(#pointerGold)"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <defs>
                  <linearGradient id="pointerGold" x1="17" y1="2" x2="17" y2="40" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fef08a" />
                    <stop offset="1" stopColor="#ca8a04" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Glowing Outer Rim with Studs */}
            <div className="absolute inset-0 rounded-full border-4 border-gold/60 shadow-[0_0_30px_rgba(234,179,8,0.25)] pointer-events-none z-20" />

            {/* Rotating Wheel Graphic */}
            <div
              className="relative size-full rounded-full overflow-hidden shadow-2xl transition-transform"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? "4.5s" : "0s",
                transitionTimingFunction: "cubic-bezier(0.15, 0.9, 0.25, 1)",
              }}
            >
              <svg viewBox="0 0 300 300" className="size-full">
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
                  const textX = 150 + 95 * Math.cos(midRad);
                  const textY = 150 + 95 * Math.sin(midRad);

                  return (
                    <g key={i}>
                      {/* Wedge Slice */}
                      <path
                        d={`M150,150 L${x1},${y1} A150,150 0 0,1 ${x2},${y2} Z`}
                        fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                        stroke="#1e1e2d"
                        strokeWidth="2.5"
                      />

                      {/* Prize Label rotated along radius */}
                      <text
                        x={textX}
                        y={textY}
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="900"
                        fontFamily="sans-serif"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(${midAngle + 90}, ${textX}, ${textY})`}
                        style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.8))" }}
                      >
                        {slice.label}
                      </text>
                    </g>
                  );
                })}

                {/* Outer Rim Lights */}
                {Array.from({ length: 24 }).map((_, idx) => {
                  const bulbAngle = (idx * (360 / 24) * Math.PI) / 180;
                  const bx = 150 + 142 * Math.cos(bulbAngle);
                  const by = 150 + 142 * Math.sin(bulbAngle);
                  return (
                    <circle
                      key={idx}
                      cx={bx}
                      cy={by}
                      r="3.5"
                      fill={idx % 2 === 0 ? "#fef08a" : "#ffffff"}
                      style={{ filter: "drop-shadow(0 0 3px #fef08a)" }}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Central Hub Button */}
            <div className="absolute size-20 rounded-full border-4 border-gold bg-gradient-to-br from-surface-2 via-surface to-background shadow-2xl flex flex-col items-center justify-center z-20 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-widest text-gold">KENO</span>
              <Coins className="size-5 text-gold animate-pulse" />
            </div>
          </div>

          {/* Won Prize Notification Banner */}
          {wonPrize && (
            <div className="mt-5 w-full rounded-2xl border border-gold/40 bg-gradient-to-r from-gold/20 via-surface to-gold/10 p-4 text-center animate-fade-up">
              <p className="text-xs font-bold uppercase tracking-wider text-gold">Prize Awarded!</p>
              <p className="text-xl font-black text-foreground mt-0.5">{wonPrize.label}</p>
              {wonPrize.cosmetic && (
                <p className="text-xs text-muted-foreground mt-0.5">Unlocked cosmetic: {wonPrize.cosmetic}</p>
              )}
            </div>
          )}

          {/* Action / Countdown Button */}
          <div className="mt-6 w-full max-w-xs space-y-2 text-center">
            {selectedTier !== myTier ? (
              <div className="rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 inline text-primary mr-1" />
                Reach <strong>{wheelDef.name}</strong> at rank tier {wheelDef.minRank} to spin this wheel!
              </div>
            ) : canSpin ? (
              <Button
                size="xl"
                disabled={spinning}
                onClick={handleSpin}
                className="w-full font-black text-base uppercase tracking-wider shadow-press bg-gradient-gold text-primary-foreground hover:brightness-110"
              >
                {spinning ? <Loader2 className="size-5 animate-spin mr-2" /> : <Sparkles className="size-5 mr-2" />}
                Spin For Free
              </Button>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-3 text-center space-y-1">
                <p className="text-xs font-semibold text-muted-foreground flex items-center justify-center gap-1.5">
                  <Clock className="size-3.5 text-accent" /> Next Free Spin In
                </p>
                <p className="font-mono text-2xl font-black text-foreground tabular">{formattedCountdown}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
