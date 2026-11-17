import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Calendar, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Amount, UserAvatar, UserName, VipTag } from "@/components/common/bits";
import { rankProgress } from "@/lib/ranks";
import { fmtCompact, fmtInt } from "@/lib/format";
import { gameName } from "@/lib/games/registry";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEquippedStyles } from "@/lib/cosmetics";

export function ProfileCardDialog() {
  const { profileCard, openProfile, isAdmin, userId } = useApp();
  const [p, setP] = useState<Tables<"profiles"> | null>(null);
  const [bets, setBets] = useState<Tables<"bets">[]>([]);

  useEffect(() => {
    if (!profileCard) return;
    setP(null);
    void supabase.from("profiles").select("*").eq("id", profileCard).maybeSingle().then(({ data }) => setP(data));
    void supabase.from("bets").select("*").eq("user_id", profileCard).order("created_at", { ascending: false }).limit(5).then(({ data }) => setBets(data ?? []));
  }, [profileCard]);

  return (
    <Dialog open={!!profileCard} onOpenChange={(v) => !v && openProfile(null)}>
      <DialogContent className="overflow-hidden border-border bg-popover p-0 sm:max-w-md">
        <DialogTitle className="sr-only">Player profile</DialogTitle>
        {!p ? (
          <div className="grid h-80 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ProfileBody p={p} bets={bets} canAdmin={isAdmin && p.id !== userId} onClose={() => openProfile(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileBody({ p, bets, canAdmin, onClose }: { p: Tables<"profiles">; bets: Tables<"bets">[]; canAdmin: boolean; onClose: () => void }) {
  const { userId, setCosmeticsOpen } = useApp();
  const equipped = useEquippedStyles(p.id);
  const prog = rankProgress(p.total_wagered);
  const profit = Number(p.total_payout) - Number(p.total_wagered);
  const banned = p.banned_until && new Date(p.banned_until) > new Date();
  const isMe = p.id === userId;

  return (
    <div className="animate-pop-in">
      <div className="relative h-24 overflow-hidden" style={{ background: `radial-gradient(120% 140% at 20% 0%, ${prog.cur.tone}, transparent 70%)` }}>
        <img src={prog.cur.icon} alt="" className="absolute -right-4 -top-6 size-40 opacity-25 blur-[1px]" />
      </div>
      <div className="-mt-10 px-6 pb-6">
        <div className="flex items-end gap-4">
          <UserAvatar
            name={p.username}
            url={p.avatar_url}
            size={80}
            className="rounded-full ring-4 ring-popover"
          />
          <div className="pb-1">
            <div className="flex items-center gap-2">
              <UserName name={p.username} font={equipped.fontFamily} glow={equipped.glowClass} className="text-xl font-bold" />
              {p.is_vip && <VipTag />}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="size-3" /> Joined {new Date(p.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        {banned && <p className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">This player is banned</p>}

        <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-surface p-4">
          <img src={prog.cur.icon} alt={prog.cur.name} className="size-16 animate-float" />
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Rank</p>
            <p className="text-xl font-bold" style={{ color: prog.cur.tone }}>{prog.cur.name}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-gradient-primary" style={{ width: `${prog.pct}%` }} /></div>
            <p className="mt-1 text-[11px] text-muted-foreground">{prog.next ? `${fmtCompact(prog.remaining)} wagered to ${prog.next.name}` : "Highest rank"}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "Wagered", v: <Amount value={p.total_wagered} compact /> },
            { l: "Profit", v: <Amount value={profit} compact className={profit >= 0 ? "text-success" : "text-destructive"} /> },
            { l: "Bets", v: fmtInt(p.bets_count) },
            { l: "Wins", v: fmtInt(p.wins_count) },
            { l: "Biggest win", v: <Amount value={p.biggest_win} compact /> },
            { l: "Best multi", v: `${Number(p.biggest_multiplier).toFixed(2)}×` },
          ].map((s) => (
            <div key={s.l} className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.l}</p>
              <div className="mt-0.5 text-sm font-bold">{s.v}</div>
            </div>
          ))}
        </div>

        {bets.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Recent bets</p>
            <div className="space-y-1">
              {bets.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-1.5 text-xs">
                  <span className="font-medium">{gameName(b.game)}</span>
                  <span className={cn("font-bold tabular", Number(b.payout) > Number(b.wager) ? "text-success" : "text-muted-foreground")}>{Number(b.multiplier).toFixed(2)}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isMe && (
          <Button
            variant="outline"
            className="mt-4 w-full border-primary/50 text-primary hover:bg-primary/10 gap-2 font-bold"
            onClick={() => {
              onClose();
              setCosmeticsOpen(true);
            }}
          >
            <Sparkles className="size-4" /> Cosmetics (Fonts & Glows)
          </Button>
        )}
        {canAdmin && (
          <Button asChild variant="surface" className="mt-4 w-full" onClick={onClose}>
            <Link to="/admin" search={{ user: p.id }}><ShieldCheck /> Manage in admin panel</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
