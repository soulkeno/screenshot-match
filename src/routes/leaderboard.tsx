import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trophy, ArrowRight, HelpCircle, Crown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Coin, RankIcon, UserAvatar } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { getRank } from "@/lib/ranks";
import { fmt, fmtCompact } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Keno Arena" },
      { name: "description", content: "Daily and all-time top high-rollers on Keno, ranked by coins wagered. Pure prestige, no prizes." },
      { property: "og:title", content: "Leaderboard — Keno Arena" },
      { property: "og:description", content: "Daily and all-time top high-rollers on Keno, ranked by coins wagered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LeaderboardPage,
});

type Mode = "daily" | "all";

interface Row {
  id: string;
  username: string;
  avatar_url: string | null;
  /** Amount this board ranks by (today's wager for daily, lifetime for all-time). */
  wagered: number;
  /** Lifetime wager, used for the VIP rank badge. */
  total_wagered: number;
}

/** Medal colours for places 1–5. */
const PLACE_TONE = ["var(--podium-gold)", "var(--podium-silver)", "var(--podium-bronze)", "var(--podium-slate)", "var(--podium-slate)"];
/** Visual stage order on wide screens: 4 · 2 · 1 · 3 · 5 */
const STAGE_ORDER = [3, 1, 0, 2, 4];
/** Pedestal heights (px) by place. */
const BASE_H = [96, 70, 56, 40, 40];

function msToMidnightUTC() {
  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, next - now.getTime());
}

function useCountdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msToMidnightUTC());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  const v = ms ?? 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    d: pad(Math.floor(v / 86_400_000)),
    h: pad(Math.floor(v / 3_600_000) % 24),
    m: pad(Math.floor(v / 60_000) % 60),
    s: pad(Math.floor(v / 1000) % 60),
  };
}

export function LeaderboardPage() {
  const { openProfile, userId } = useApp();
  const [mode, setMode] = useState<Mode>("daily");
  const [rows, setRows] = useState<Row[]>([]);
  const [myPlace, setMyPlace] = useState<{ place: number; wagered: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const time = useCountdown();

  useEffect(() => {
    let cancel = false;
    async function load(first: boolean) {
      if (first) setLoading(true);
      try {
        if (mode === "daily") {
          const [{ data }, mine] = await Promise.all([
            supabase.rpc("daily_race", { p_limit: 50 }),
            userId ? supabase.rpc("my_race_place") : Promise.resolve({ data: null }),
          ]);
          if (cancel) return;
          setRows(
            (data ?? []).map((r) => ({
              id: r.user_id,
              username: r.username || "Player",
              avatar_url: r.avatar_url,
              wagered: Number(r.wagered || 0),
              total_wagered: Number(r.total_wagered || 0),
            })),
          );
          const m = (mine.data as { place: number; wagered: number }[] | null)?.[0];
          setMyPlace(m && Number(m.place) > 0 ? { place: Number(m.place), wagered: Number(m.wagered) } : null);
        } else {
          const { data } = await supabase
            .from("profiles")
            .select("id, username, avatar_url, total_wagered")
            .gt("total_wagered", 0)
            .order("total_wagered", { ascending: false })
            .limit(50);
          if (cancel) return;
          const list = (data ?? []).map((p) => ({
            id: p.id,
            username: p.username || "Player",
            avatar_url: p.avatar_url,
            wagered: Number(p.total_wagered || 0),
            total_wagered: Number(p.total_wagered || 0),
          }));
          setRows(list);
          const idx = userId ? list.findIndex((p) => p.id === userId) : -1;
          setMyPlace(idx >= 0 ? { place: idx + 1, wagered: list[idx].wagered } : null);
        }
      } finally {
        if (!cancel && first) setLoading(false);
      }
    }
    void load(true);
    const t = setInterval(() => void load(false), 30_000);
    return () => {
      cancel = true;
      clearInterval(t);
    };
  }, [mode, userId]);

  const top5 = useMemo(() => [0, 1, 2, 3, 4].map((i) => rows[i] ?? null), [rows]);
  const rest = rows.slice(5);
  const placeholderCount = Math.max(0, 5 - rest.length);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16 animate-fade-up">
      {/* ───────── Hero arena ───────── */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-b from-arena via-arena-deep to-background px-4 pb-6 pt-8 shadow-[var(--shadow-card)] sm:px-10 sm:pt-10">
        {/* ambient glows */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[46rem] -translate-x-1/2 rounded-full bg-arena-glow/20 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-64 w-[52rem] -translate-x-1/2 rounded-full bg-arena-glow/30 blur-[140px]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at 50% 40%, black 10%, transparent 70%)",
          }}
        />

        {/* floating dice */}
        <Die pips={5} className="left-[4%] top-16 size-16 -rotate-[18deg]" delay="0s" />
        <Die pips={3} className="left-[13%] top-56 size-10 rotate-[30deg] opacity-60 blur-[1px]" delay="1.2s" />
        <Die pips={6} className="right-[5%] top-20 size-20 rotate-[22deg]" delay="0.6s" />
        <Die pips={2} className="right-[14%] top-60 size-11 -rotate-12 opacity-60 blur-[1px]" delay="1.8s" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* mode toggle */}
          <div className="mb-5 inline-flex rounded-full border border-border bg-background/60 p-1 backdrop-blur">
            {(["daily", "all"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-bold transition",
                  mode === m ? "bg-arena-glow text-foreground shadow-[0_0_18px_-2px_var(--arena-glow)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "daily" ? "Daily race" : "All-time"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-4xl font-black tracking-tight text-foreground sm:text-6xl">Leaderboard</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">Daily and all-time top high-rollers and wagering champions.</p>

          {/* countdown */}
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-arena-glow">
            {mode === "daily" ? "Daily race resets in" : "Today's race resets in"}
          </p>
          <div className="mt-2 flex items-start gap-1.5 sm:gap-2.5">
            <TimeTile value={time.d} label="Days" />
            <Colon />
            <TimeTile value={time.h} label="Hours" />
            <Colon />
            <TimeTile value={time.m} label="Minutes" />
            <Colon />
            <TimeTile value={time.s} label="Seconds" />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-black text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-105"
            >
              Play Now <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => setHelpOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-5 py-2.5 text-sm font-bold text-foreground transition hover:bg-foreground/10"
            >
              <HelpCircle className="size-4 text-arena-glow" /> How It Works
            </button>
          </div>

          {/* your place */}
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-xs">
            <Users className="size-3.5 text-muted-foreground" />
            <span className="font-bold uppercase tracking-wider text-muted-foreground">Your place</span>
            {myPlace ? (
              <span className="font-black text-foreground">
                #{myPlace.place} · <Coin className="size-3 -mt-0.5" /> {fmtCompact(myPlace.wagered)}
              </span>
            ) : (
              <span className="font-bold text-foreground/70">{userId ? "Not ranked yet" : "Sign in to compete"}</span>
            )}
          </div>

          {/* ───────── Podium stage ───────── */}
          <div className="relative mt-10 w-full">
            {/* stage floor */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto hidden h-24 max-w-5xl rounded-[50%] md:block"
              style={{ background: "radial-gradient(ellipse at center, color-mix(in oklab, var(--arena-glow) 45%, transparent), transparent 70%)" }}
            />
            <div className="relative grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-5 md:items-end md:gap-4">
              {STAGE_ORDER.map((placeIdx) => (
                <Pedestal
                  key={placeIdx}
                  place={placeIdx + 1}
                  player={top5[placeIdx]}
                  loading={loading}
                  isMe={!!top5[placeIdx] && top5[placeIdx]!.id === userId}
                  onOpen={(id) => openProfile(id)}
                  className={cn(
                    // mobile/tablet: natural order 1..5 with #1 spanning full width
                    placeIdx === 0 && "order-first col-span-2 sm:col-span-3 md:order-none md:col-span-1",
                    placeIdx === 1 && "order-1 md:order-none",
                    placeIdx === 2 && "order-2 md:order-none",
                    placeIdx === 3 && "order-3 md:order-none",
                    placeIdx === 4 && "order-4 md:order-none",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Table #6+ ───────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-foreground">
            <Trophy className="size-4 text-arena-glow" /> Contenders
          </h2>
          <span className="text-xs text-muted-foreground">{mode === "daily" ? "Wagered today (UTC)" : "Wagered all-time"}</span>
        </div>

        <div className="grid grid-cols-[3.5rem_1fr_auto] gap-3 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <span>#</span>
          <span>Player</span>
          <span className="text-right">Wagered</span>
        </div>

        <div className="space-y-1.5">
          {rest.map((p, i) => {
            const place = i + 6;
            const r = getRank(p.total_wagered);
            const isMe = p.id === userId;
            return (
              <button
                key={p.id}
                onClick={() => openProfile(p.id)}
                className={cn(
                  "grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left text-sm transition hover:border-arena-glow/40 hover:bg-secondary",
                  isMe && "border-primary/50 bg-primary/5",
                )}
              >
                <span className="grid h-7 w-10 place-items-center rounded-lg bg-background font-mono text-xs font-black text-muted-foreground">
                  {place}
                </span>
                <span className="flex min-w-0 items-center gap-3">
                  <UserAvatar name={p.username} url={p.avatar_url} size={30} />
                  <span className="truncate font-bold text-foreground">{p.username}</span>
                  {isMe && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[9px] font-black text-primary">YOU</span>}
                  <span
                    className="hidden items-center gap-1 rounded-md border border-border bg-background/60 px-2 py-0.5 text-[10px] font-bold sm:inline-flex"
                    style={{ color: r.tone }}
                  >
                    <RankIcon wagered={p.total_wagered} size={14} /> {r.name}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 justify-self-end rounded-full border border-border bg-background/60 px-3 py-1 font-mono text-xs font-bold text-foreground">
                  <Coin className="size-3.5" /> {fmt(p.wagered, 2)}
                </span>
              </button>
            );
          })}

          {Array.from({ length: placeholderCount }).map((_, i) => (
            <div
              key={`ph-${i}`}
              className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-4 py-3 text-sm"
            >
              <span className="grid h-7 w-10 place-items-center rounded-lg bg-background/60 font-mono text-xs font-black text-muted-foreground/50">
                {rest.length + i + 6}
              </span>
              <span className="flex items-center gap-3 text-muted-foreground/50">
                <span className="size-[30px] rounded-full bg-secondary" />
                <span className="h-2.5 w-24 rounded-full bg-secondary" />
              </span>
              <span className="justify-self-end font-mono text-xs text-muted-foreground/50">—</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="rounded-3xl border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-black">
              <Trophy className="size-5 text-arena-glow" /> How the leaderboard works
            </DialogTitle>
          </DialogHeader>
          <ul className="space-y-3 pt-1 text-sm leading-relaxed text-muted-foreground">
            <li>• Every bet you place on any game adds its full bet amount to your wagered total — win or lose.</li>
            <li>
              • <strong className="text-foreground">Daily race</strong> counts only what you wager today and resets every day at{" "}
              <strong className="text-foreground">00:00 UTC</strong>.
            </li>
            <li>
              • <strong className="text-foreground">All-time</strong> ranks everyone by their lifetime wagered total, which also decides your VIP rank.
            </li>
            <li>• The board refreshes automatically every 30 seconds.</li>
            <li>• There are no prizes — this board is purely for prestige and bragging rights.</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ───────── pieces ───────── */

function TimeTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[3.25rem] rounded-2xl border border-border bg-background/80 px-3 py-2.5 font-mono text-2xl font-black text-foreground shadow-[inset_0_1px_0_color-mix(in_oklab,var(--foreground)_8%,transparent)] sm:min-w-[4.5rem] sm:text-3xl">
        {value}
      </div>
      <span className="mt-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function Colon() {
  return <span className="pt-2.5 text-2xl font-black text-muted-foreground/50 sm:text-3xl">:</span>;
}

const PIP_LAYOUT: Record<number, number[]> = {
  2: [0, 8],
  3: [0, 4, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ pips, className, delay }: { pips: number; className?: string; delay: string }) {
  const on = PIP_LAYOUT[pips] ?? [4];
  return (
    <div className={cn("pointer-events-none absolute hidden md:block", className)}>
      <div className="size-full animate-float" style={{ animationDelay: delay, animationDuration: "5s" }}>
        <div className="grid size-full grid-cols-3 grid-rows-3 place-items-center rounded-[22%] bg-gradient-to-br from-playing-card via-playing-card to-muted-foreground p-[14%] shadow-[0_18px_30px_-8px_rgba(0,0,0,0.8),inset_0_-4px_0_rgba(0,0,0,0.18)]">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className={cn("size-[70%] rounded-full", on.includes(i) ? "bg-suit-black" : "bg-transparent")} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Pedestal({
  place,
  player,
  loading,
  isMe,
  onOpen,
  className,
}: {
  place: number;
  player: Row | null;
  loading: boolean;
  isMe: boolean;
  onOpen: (id: string) => void;
  className?: string;
}) {
  const tone = PLACE_TONE[place - 1];
  const first = place === 1;
  const rank = getRank(player?.total_wagered ?? 0);
  const style = { "--tone": tone } as CSSProperties;

  return (
    <div className={cn("flex flex-col items-center", className)} style={style}>
      {/* stat pill */}
      <span className="mb-2 rounded-full border border-border bg-background/80 px-3 py-1 font-mono text-[11px] font-bold text-foreground backdrop-blur">
        {player ? `${fmtCompact(player.wagered)} Wagered` : "— Wagered"}
      </span>

      <button
        type="button"
        disabled={!player}
        onClick={() => player && onOpen(player.id)}
        className={cn(
          "group relative w-full max-w-[13rem] transition duration-300 enabled:hover:-translate-y-1.5 disabled:cursor-default",
          first && "md:max-w-[15rem]",
        )}
      >
        {/* floating avatar */}
        <div className="relative z-10 mx-auto -mb-9 w-fit">
          {first && <Crown className="absolute -top-6 left-1/2 size-6 -translate-x-1/2 fill-[var(--tone)] text-[var(--tone)] drop-shadow-[0_0_8px_var(--tone)]" />}
          <div
            className="rounded-full p-[3px]"
            style={{ background: "linear-gradient(160deg, var(--tone), color-mix(in oklab, var(--tone) 25%, transparent))", boxShadow: "0 0 26px -4px var(--tone)" }}
          >
            {player ? (
              <UserAvatar name={player.username} url={player.avatar_url} size={first ? 76 : 62} />
            ) : (
              <div className={cn("rounded-full bg-secondary", first ? "size-[76px]" : "size-[62px]", loading && "animate-pulse")} />
            )}
          </div>
          <span
            className="absolute -bottom-1 left-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full border-2 border-background text-[11px] font-black text-background"
            style={{ background: "var(--tone)" }}
          >
            {place}
          </span>
        </div>

        {/* shield card */}
        <div
          className={cn("relative px-4 pb-6 pt-12 text-center", first ? "min-h-[11.5rem]" : "min-h-[10rem]")}
          style={{
            clipPath: "polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)",
            background:
              "linear-gradient(180deg, color-mix(in oklab, var(--tone) 22%, var(--card)), var(--card) 55%, var(--arena-deep))",
          }}
        >
          {/* neon top edge */}
          <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, var(--tone), transparent)" }} />
          <p className={cn("truncate font-black text-foreground", first ? "text-base" : "text-sm")}>
            {player ? player.username : loading ? "…" : "Empty seat"}
          </p>
          {player && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: rank.tone }}>
              <RankIcon wagered={player.total_wagered} size={14} /> {rank.name}
            </p>
          )}
          {isMe && <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-primary">You</p>}

          <div className="mx-auto mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 font-mono text-xs font-bold text-foreground">
            <Coin className="size-3.5" />
            <span className="truncate">{player ? fmt(player.wagered, 2) : "0.00"}</span>
          </div>
        </div>
      </button>

      {/* angled pedestal base */}
      <div className="relative mt-1 hidden w-full max-w-[14rem] md:block" style={{ height: BASE_H[place - 1] }}>
        <div
          className="absolute inset-0"
          style={{
            clipPath: "polygon(8% 0, 92% 0, 100% 100%, 0 100%)",
            background: "linear-gradient(180deg, color-mix(in oklab, var(--tone) 30%, var(--secondary)), var(--arena-deep))",
          }}
        />
        <div
          className="absolute inset-x-[8%] top-0 h-[2px]"
          style={{ background: "var(--tone)", boxShadow: "0 0 14px 1px var(--tone)" }}
        />
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-2xl font-black text-foreground/15">
          #{place}
        </span>
      </div>
    </div>
  );
}
