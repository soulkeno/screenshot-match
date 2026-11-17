import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trophy, Crown, Medal, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Amount, Coin, RankIcon, RankTag, UserAvatar, VipTag, UserName } from "@/components/common/bits";
import { useApp } from "@/lib/app-context";
import { getRank } from "@/lib/ranks";
import { fmt, fmtCompact } from "@/lib/format";
import { useEquippedStyles } from "@/lib/cosmetics";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Leaderboard — Keno Casino" },
      { name: "description", content: "All-time highest wagerers & high rollers. Real-time live rankings updated 24/7." },
      { property: "og:title", content: "Leaderboard — Keno Casino" },
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

export function LeaderboardPage() {
  const { openProfile, userId, profile } = useApp();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [myWagered, setMyWagered] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        // Query profiles ordered strictly by all-time total_wagered
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_vip, total_wagered")
          .order("total_wagered", { ascending: false })
          .limit(100);

        if (!cancel && data) {
          const list: LeaderboardPlayer[] = data.map((p) => ({
            id: p.id,
            username: p.username || "Player",
            avatar_url: p.avatar_url,
            is_vip: !!p.is_vip,
            total_wagered: Number(p.total_wagered || 0),
          }));
          setPlayers(list);

          // Find exact user rank in the list
          if (userId) {
            const idx = list.findIndex((p) => p.id === userId);
            if (idx !== -1) {
              setMyRank(idx + 1);
              setMyWagered(list[idx].total_wagered);
            } else if (profile?.total_wagered) {
              const { count } = await supabase
                .from("profiles")
                .select("id", { count: "exact", head: true })
                .gt("total_wagered", profile.total_wagered);
              setMyRank((count ?? 0) + 1);
              setMyWagered(Number(profile.total_wagered));
            }
          }
        }
      } catch {
        // Safe catch
      } finally {
        if (!cancel) setLoading(false);
      }
    }

    void load();
    return () => {
      cancel = true;
    };
  }, [userId, profile?.total_wagered]);

  // Podium order according to the requested layout: #4, #2, #1 (center & tallest), #3, #5
  const top1 = players[0] ?? null;
  const top2 = players[1] ?? null;
  const top3 = players[2] ?? null;
  const top4 = players[3] ?? null;
  const top5 = players[4] ?? null;
  const rest = players.slice(5);

  return (
    <div className="animate-fade-up space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-surface-2 via-surface to-background p-6 shadow-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Trophy className="size-6 text-gold animate-bounce" />
              <h1 className="text-2xl font-black uppercase tracking-wide">Leaderboard</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time highest wagerers & high rollers. Updated in real time.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-1.5 backdrop-blur-sm">
                <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Your Place</span>
                <span className={cn("font-bold text-sm", myRank ? "text-primary" : "text-muted-foreground")}>
                  {myRank ? `#${myRank}` : "Not ranked"}
                </span>
                {myWagered > 0 && (
                  <span className="text-[11px] text-muted-foreground ml-1">
                    (<Coin className="size-3 inline mr-0.5" />{fmtCompact(myWagered)})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 pr-2">
            <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-gold/20 via-surface-2 to-primary/20 border border-gold/40 shadow-glow">
              <Trophy className="size-8 text-gold drop-shadow-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Podium Cards (Order: #4, #2, #1 Center, #3, #5) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 items-end">
        {/* #4 Podium */}
        <PodiumCard player={top4} rank={4} onOpen={openProfile} isSelf={top4?.id === userId} />

        {/* #2 Podium */}
        <PodiumCard player={top2} rank={2} onOpen={openProfile} isSelf={top2?.id === userId} />

        {/* #1 Podium (Center, Prominent, Highlighted) */}
        <PodiumCard player={top1} rank={1} isWinner onOpen={openProfile} isSelf={top1?.id === userId} />

        {/* #3 Podium */}
        <PodiumCard player={top3} rank={3} onOpen={openProfile} isSelf={top3?.id === userId} />

        {/* #5 Podium */}
        <PodiumCard player={top5} rank={5} onOpen={openProfile} isSelf={top5?.id === userId} />
      </div>

      {/* Table for #6 and onwards */}
      <div className="panel overflow-hidden border border-border shadow-card rounded-2xl bg-surface">
        <div className="grid grid-cols-12 gap-3 border-b border-border bg-surface-2 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-6 sm:col-span-5">Player</div>
          <div className="col-span-3 sm:col-span-3">Rank</div>
          <div className="col-span-2 sm:col-span-3 text-right">Wagered</div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-muted-foreground animate-pulse">Loading leaderboard...</div>
        ) : rest.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {players.length === 0 ? "No players registered yet." : "Top players shown on the podium above."}
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {rest.map((p, idx) => {
              const position = idx + 6;
              const r = getRank(p.total_wagered);
              const isMe = p.id === userId;
              return (
                <button
                  key={p.id}
                  onClick={() => openProfile(p.id)}
                  className={cn(
                    "grid grid-cols-12 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2",
                    isMe && "bg-primary/10 border-l-2 border-primary"
                  )}
                >
                  <div className="col-span-1 text-center font-mono text-xs font-bold text-muted-foreground">
                    #{position}
                  </div>

                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2.5 min-w-0">
                    <UserAvatar name={p.username} url={p.avatar_url} size={30} />
                    <span className="truncate font-semibold text-sm hover:underline">{p.username}</span>
                    {p.is_vip && <VipTag />}
                    {isMe && (
                      <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold uppercase text-primary">
                        You
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 sm:col-span-3 flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-surface-2 px-2 py-0.5 text-[11px] font-bold"
                      style={{ color: r.tone }}
                    >
                      <RankIcon wagered={p.total_wagered} size={13} />
                      <span className="truncate">{r.name}</span>
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-3 text-right font-bold tabular text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Coin className="size-3.5 inline" />
                      {fmt(p.total_wagered, 0)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({
  player,
  rank,
  isWinner,
  onOpen,
  isSelf,
}: {
  player: LeaderboardPlayer | null;
  rank: number;
  isWinner?: boolean;
  onOpen: (id: string) => void;
  isSelf?: boolean;
}) {
  const wagered = player?.total_wagered ?? 0;
  const r = getRank(wagered);

  // Styling based on rank
  const badgeColors: Record<number, { border: string; bg: string; text: string; glow: string }> = {
    1: { border: "border-gold/60", bg: "from-gold/20 via-surface to-background", text: "text-gold", glow: "shadow-gold/20 shadow-xl" },
    2: { border: "border-border/80", bg: "from-surface-2 to-surface", text: "text-foreground", glow: "shadow-md" },
    3: { border: "border-amber-700/50", bg: "from-amber-900/15 via-surface to-surface", text: "text-amber-500", glow: "shadow-md" },
    4: { border: "border-border/60", bg: "from-surface to-surface", text: "text-muted-foreground", glow: "shadow-sm" },
    5: { border: "border-border/60", bg: "from-surface to-surface", text: "text-muted-foreground", glow: "shadow-sm" },
  };

  const style = badgeColors[rank] || badgeColors[4];

  return (
    <div
      onClick={() => player && onOpen(player.id)}
      className={cn(
        "relative rounded-2xl border p-4 flex flex-col items-center text-center transition-all cursor-pointer hover:-translate-y-1 bg-gradient-to-b",
        style.border,
        style.bg,
        style.glow,
        isWinner ? "h-[260px] justify-between ring-2 ring-gold/40 pb-5 pt-3" : "h-[230px] justify-between pb-4 pt-3",
        isSelf && "ring-2 ring-primary"
      )}
    >
      {/* Rank Header Tag */}
      <div className="flex items-center justify-center">
        <span
          className={cn(
            "rounded-full px-3 py-0.5 text-xs font-black tracking-wide flex items-center gap-1",
            isWinner
              ? "bg-gold text-primary-foreground shadow-sm"
              : rank <= 3
                ? "bg-surface-2 border border-border font-bold"
                : "text-muted-foreground font-semibold"
          )}
        >
          {isWinner && <Crown className="size-3 fill-current inline" />}
          #{rank}
        </span>
      </div>

      {/* Avatar & Player Info */}
      <div className="flex flex-col items-center">
        <div className="relative my-2">
          <UserAvatar
            name={player?.username || "?"}
            url={player?.avatar_url}
            size={isWinner ? 54 : 44}
            className={cn("ring-2", isWinner ? "ring-gold" : "ring-border")}
          />
          {isWinner && (
            <div className="absolute -top-3 -right-2 grid size-6 place-items-center rounded-full bg-gold text-primary-foreground shadow-md animate-bounce">
              <Crown className="size-3.5 fill-current" />
            </div>
          )}
        </div>

        <p className="font-bold text-sm truncate max-w-[130px]">{player ? player.username : "Empty"}</p>

        {player && (
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-md border border-border/60 bg-surface-2/80 px-2 py-0.5 text-[10px] font-bold"
            style={{ color: r.tone }}
          >
            <RankIcon wagered={wagered} size={11} />
            <span className="truncate max-w-[90px]">{r.name}</span>
          </span>
        )}
      </div>

      {/* Total Wagered (strictly NO prizes) */}
      <div className="w-full pt-2 border-t border-border/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Wagered</p>
        <p className="font-bold text-xs tabular mt-0.5 text-foreground flex items-center justify-center gap-1 truncate">
          <Coin className="size-3 shrink-0" />
          <span>{player ? fmt(player.total_wagered, 0) : "0"}</span>
        </p>
      </div>
    </div>
  );
}
