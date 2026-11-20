import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, Crown, ArrowRight, HelpCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Coin, RankIcon, UserAvatar, UserName } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { getRank } from "@/lib/ranks";
import { fmt, fmtCompact } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Keno Arena" },
      { name: "description", content: "Top wagering champions on Keno. Compete for the #1 weekly crown and glory." },
    ],
  }),
  component: LeaderboardPage,
});

interface LeaderboardPlayer {
  id: string;
  username: string;
  avatar_url: string | null;
  is_vip: boolean;
  total_wagered: number;
}

// Target countdown: Every New Friday at 14:20
function getNextFriday1420(): number {
  const now = new Date();
  const target = new Date(now);
  const day = now.getDay(); // 0 is Sunday, 5 is Friday
  let daysUntilFriday = (5 - day + 7) % 7;
  target.setDate(now.getDate() + daysUntilFriday);
  target.setHours(14, 20, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 7);
  }
  return target.getTime();
}

export function LeaderboardPage() {
  const { openProfile, userId } = useApp();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ d: string; h: string; m: string; s: string }>({
    d: "00",
    h: "00",
    m: "00",
    s: "00",
  });

  // Countdown timer to Friday 14:20
  useEffect(() => {
    function updateTimer() {
      const target = getNextFriday1420();
      const diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);

      setTimeLeft({
        d: String(d).padStart(2, "0"),
        h: String(h).padStart(2, "0"),
        m: String(m).padStart(2, "0"),
        s: String(s).padStart(2, "0"),
      });
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real players ordered strictly by all-time wagered
  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_vip, total_wagered")
          .order("total_wagered", { ascending: false })
          .limit(50);

        if (!cancel && data) {
          const list: LeaderboardPlayer[] = data.map((p) => ({
            id: p.id,
            username: p.username || "Player",
            avatar_url: p.avatar_url,
            is_vip: !!p.is_vip,
            total_wagered: Number(p.total_wagered || 0),
          }));
          setPlayers(list);
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    void load();
    return () => { cancel = true; };
  }, []);

  const top5 = [
    players[0] ?? null,
    players[1] ?? null,
    players[2] ?? null,
    players[3] ?? null,
    players[4] ?? null,
  ];
  const rest = players.slice(5);

  return (
    <div className="mx-auto max-w-5xl space-y-10 animate-fade-up select-none pb-16">
      {/* 1. Hero Stage & Countdown (Matching media_1795194417577_4319783a.jpg) */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#16132b] via-[#10121d] to-[#0c0d14] p-6 sm:p-10 shadow-2xl">
        {/* Ambient Neon Violet/Indigo Oval Glow */}
        <div className="pointer-events-none absolute left-1/2 -bottom-20 -translate-x-1/2 h-72 w-[600px] rounded-full bg-violet-600/25 blur-[120px]" />
        
        {/* Floating 3D Dice (Left) */}
        <div className="pointer-events-none absolute -left-4 top-16 hidden md:block opacity-75 animate-float" style={{ animationDuration: "5s" }}>
          <div className="relative size-16 rounded-2xl bg-gradient-to-br from-white via-slate-200 to-slate-400 p-2 shadow-[0_15px_30px_rgba(0,0,0,0.8)] rotate-[-18deg] border border-white/50">
            <div className="grid grid-cols-2 gap-2 h-full place-items-center">
              <span className="size-2.5 rounded-full bg-black shadow-inner" />
              <span className="size-2.5 rounded-full bg-black shadow-inner" />
              <span className="size-2.5 rounded-full bg-black shadow-inner" />
              <span className="size-2.5 rounded-full bg-black shadow-inner" />
            </div>
          </div>
        </div>

        {/* Floating 3D Dice (Right) */}
        <div className="pointer-events-none absolute -right-4 top-20 hidden md:block opacity-75 animate-float" style={{ animationDuration: "6s" }}>
          <div className="relative size-20 rounded-2xl bg-gradient-to-br from-white via-slate-200 to-slate-400 p-2.5 shadow-[0_15px_35px_rgba(0,0,0,0.8)] rotate-[22deg] border border-white/50">
            <div className="grid grid-cols-3 gap-1.5 h-full place-items-center">
              <span className="size-2 rounded-full bg-black shadow-inner" />
              <span className="size-2 rounded-full bg-black shadow-inner" />
              <span className="size-2 rounded-full bg-black shadow-inner" />
              <span className="size-2 rounded-full bg-black shadow-inner" />
              <span className="size-2 rounded-full bg-black shadow-inner" />
              <span className="size-2 rounded-full bg-black shadow-inner" />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-purple-300 shadow-sm">
            Arena Rankings
          </span>

          <h1 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight text-white">
            Leaderboard
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground max-w-lg">
            Daily and all-time top high-rollers and wagering champions.
          </p>

          <p className="mt-4 text-xs font-semibold text-purple-300/80">
            The round resets every Friday at 14:20
          </p>

          {/* Segmented Timer Display: [ DAYS ] : [ HOURS ] : [ MINUTES ] : [ SECONDS ] */}
          <div className="mt-4 flex items-center gap-2 sm:gap-3 text-white">
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-white/10 bg-[#161a26]/90 px-3.5 py-2.5 sm:px-5 sm:py-3 font-mono text-xl sm:text-2xl font-black shadow-lg">
                {timeLeft.d}
              </div>
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                DAYS
              </span>
            </div>
            <span className="text-xl font-bold text-muted-foreground/60 -mt-4">:</span>
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-white/10 bg-[#161a26]/90 px-3.5 py-2.5 sm:px-5 sm:py-3 font-mono text-xl sm:text-2xl font-black shadow-lg">
                {timeLeft.h}
              </div>
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                HOURS
              </span>
            </div>
            <span className="text-xl font-bold text-muted-foreground/60 -mt-4">:</span>
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-white/10 bg-[#161a26]/90 px-3.5 py-2.5 sm:px-5 sm:py-3 font-mono text-xl sm:text-2xl font-black shadow-lg">
                {timeLeft.m}
              </div>
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                MINUTES
              </span>
            </div>
            <span className="text-xl font-bold text-muted-foreground/60 -mt-4">:</span>
            <div className="flex flex-col items-center">
              <div className="rounded-xl border border-white/10 bg-[#161a26]/90 px-3.5 py-2.5 sm:px-5 sm:py-3 font-mono text-xl sm:text-2xl font-black shadow-lg">
                {timeLeft.s}
              </div>
              <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                SECONDS
              </span>
            </div>
          </div>

          {/* Action Buttons Below Timer */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#00d293] to-emerald-400 hover:from-[#00d293]/95 hover:to-emerald-300 text-[#05261b] px-6 py-2.5 text-xs font-black shadow-[0_4px_20px_rgba(0,210,147,0.4)] transition hover:scale-105"
            >
              <span>Play Now</span>
              <ArrowRight className="size-3.5" />
            </Link>

            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 text-xs font-bold transition"
            >
              <HelpCircle className="size-3.5 text-purple-400" />
              <span>How It Works</span>
            </button>
          </div>

          {/* 2. Top 5 Pedestals / Podium Cards (Horizontal Stage) */}
          <div className="mt-10 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-4">
            {top5.map((p, idx) => {
              const rankNum = idx + 1;
              const isFirst = rankNum === 1;
              const wagered = p?.total_wagered ?? 0;
              const r = getRank(wagered);

              return (
                <div
                  key={rankNum}
                  onClick={() => p && openProfile(p.id)}
                  className={cn(
                    "group relative flex flex-col items-center justify-between rounded-2xl border p-3.5 text-center transition-all duration-300 cursor-pointer hover:-translate-y-1.5",
                    isFirst
                      ? "border-amber-400/60 bg-gradient-to-b from-amber-500/25 via-[#161a26] to-[#0f111a] shadow-[0_0_35px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50"
                      : rankNum === 2
                      ? "border-slate-300/40 bg-gradient-to-b from-slate-400/20 via-[#161a26] to-[#0f111a] shadow-lg"
                      : rankNum === 3
                      ? "border-amber-700/40 bg-gradient-to-b from-amber-800/20 via-[#161a26] to-[#0f111a] shadow-lg"
                      : "border-white/5 bg-gradient-to-b from-white/5 via-[#161a26] to-[#0f111a]"
                  )}
                >
                  {/* Stat Pill Above Card */}
                  <span className="rounded-full bg-black/60 border border-white/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-white/90">
                    {fmtCompact(wagered)} Wagered
                  </span>

                  {/* Floating Circular Avatar with Rank Badge */}
                  <div className="relative my-3">
                    <div
                      className={cn(
                        "rounded-full p-0.5 shadow-xl",
                        isFirst ? "ring-2 ring-amber-400" : rankNum <= 3 ? "ring-2 ring-white/40" : "ring-1 ring-white/20"
                      )}
                    >
                      <UserAvatar name={p?.username || `P${rankNum}`} url={p?.avatar_url} size={48} />
                    </div>

                    {/* Rank Number Badge */}
                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-[10px] font-black shadow-md",
                        isFirst
                          ? "bg-amber-400 text-black shadow-amber-400/50"
                          : rankNum === 2
                          ? "bg-slate-300 text-black"
                          : rankNum === 3
                          ? "bg-amber-700 text-white"
                          : "bg-black/80 text-white border border-white/20"
                      )}
                    >
                      {rankNum}
                    </div>
                  </div>

                  {/* Username */}
                  <div className="w-full">
                    <p className="font-bold text-xs text-white truncate max-w-full">
                      {p?.username ?? "Unclaimed"}
                    </p>
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: r.tone }}>
                      {r.name}
                    </p>
                  </div>

                  {/* Bottom Pill Badge with exact total coins wagered */}
                  <div className="mt-3 w-full rounded-full bg-black/50 border border-white/10 py-1 px-2 flex items-center justify-center gap-1 font-mono text-[11px] font-bold text-white shadow-inner">
                    <Coin className="size-3" />
                    <span className="truncate">{fmtCompact(wagered)}</span>
                  </div>

                  {/* IMPORTANT RULE: ONLY #1 has a prize which is "15 SEK" */}
                  {isFirst && (
                    <div className="mt-2 w-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 py-0.5 px-2 text-[10px] font-black uppercase tracking-wider text-black shadow-md animate-pulse">
                      🏆 Prize: 15 SEK
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Leaderboard Table (Ranks #6 and beyond) - ONLY 3 columns, NO PRIZE COLUMN */}
      <div className="space-y-3">
        <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
          <Trophy className="size-4 text-[#00d293]" />
          <span>Contenders (#6 and beyond)</span>
        </h2>

        {rest.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#161a26]/60 p-8 text-center text-xs text-muted-foreground">
            No further players recorded yet. Start wagering to claim your rank!
          </div>
        ) : (
          <div className="space-y-1.5">
            {rest.map((p, idx) => {
              const rankNum = idx + 6;
              const r = getRank(p.total_wagered);
              const isMe = p.id === userId;

              return (
                <div
                  key={p.id}
                  onClick={() => openProfile(p.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border border-white/5 bg-[#141824] px-4 py-3 text-xs shadow-sm transition hover:border-[#00d293]/30 hover:bg-[#1a2030] cursor-pointer",
                    isMe && "border-[#00d293]/50 bg-[#00d293]/5"
                  )}
                >
                  {/* Column 1: Rank Number Badge */}
                  <div className="w-12 shrink-0">
                    <span className="grid size-6 place-items-center rounded-lg bg-black/50 text-[11px] font-mono font-black text-muted-foreground border border-white/5">
                      #{rankNum}
                    </span>
                  </div>

                  {/* Column 2: Player (Avatar + Username + VIP Rank badge) */}
                  <div className="flex flex-1 items-center gap-3 min-w-0 pr-4">
                    <UserAvatar name={p.username} url={p.avatar_url} size={28} />
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-white truncate max-w-[130px] sm:max-w-[200px]">
                        {p.username}
                      </span>
                      {isMe && (
                        <span className="rounded-full bg-[#00d293]/20 border border-[#00d293]/40 px-2 py-0.2 text-[9px] font-black text-[#00d293]">
                          YOU
                        </span>
                      )}
                    </div>
                    <span
                      className="hidden sm:inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border border-white/5 bg-black/40"
                      style={{ color: r.tone }}
                    >
                      <RankIcon wagered={p.total_wagered} size={12} />
                      <span>{r.name}</span>
                    </span>
                  </div>

                  {/* Column 3: Wagered (Coin icon + total coins wagered) */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1.5 font-mono font-bold text-xs text-white bg-black/40 border border-white/5 px-3 py-1 rounded-full">
                      <Coin className="size-3.5" />
                      <span>{fmt(p.total_wagered, 0)}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* How It Works Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="border-white/10 bg-[#161a26] text-white rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Trophy className="size-5 text-amber-400" />
              <span>How The Leaderboard Works</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground leading-relaxed pt-2">
            <p>
              • Every bet placed on any game (Mines, Crash, Blackjack, Slots, PvP Duels, etc.) adds directly to your total wagered coins.
            </p>
            <p>
              • The rankings update live in real-time with zero delay.
            </p>
            <p>
              • The weekly period concludes every <strong className="text-white">Friday at 14:20</strong>.
            </p>
            <p>
              • The #1 champion takes the exclusive <strong className="text-amber-400">15 SEK</strong> reward and permanent bragging rights!
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
