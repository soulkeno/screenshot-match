import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, ShieldCheck, Calendar, Sparkles, Coins, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useApp } from "@/lib/app-context";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Amount, UserAvatar, UserName, VipTag } from "@/components/common/bits";
import { rankProgress } from "@/lib/ranks";
import { errMsg, fmt, fmtInt } from "@/lib/format";
import { gameName } from "@/lib/games/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const prog = p ? rankProgress(p.total_wagered) : null;
  const tone = prog?.cur.tone ?? "#00d293";

  return (
    <Dialog open={!!profileCard} onOpenChange={(v) => !v && openProfile(null)}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-md rounded-3xl transition-all duration-300"
        style={{
          border: `1px solid ${tone}40`,
          boxShadow: `0 20px 50px -10px ${tone}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
          background: `linear-gradient(180deg, ${tone}25 0%, rgba(20,24,33,0.96) 35%, #101218 100%)`,
        }}
      >
        <DialogTitle className="sr-only">Player profile</DialogTitle>
        {!p ? (
          <div className="grid h-80 place-items-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ProfileBody p={p} bets={bets} canAdmin={isAdmin && p.id !== userId} onClose={() => openProfile(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProfileBody({ p, bets, canAdmin, onClose }: { p: Tables<"profiles">; bets: Tables<"bets">[]; canAdmin: boolean; onClose: () => void }) {
  const { userId, setCosmeticsOpen, refresh } = useApp();
  const [tipOpen, setTipOpen] = useState(false);
  const [tipAmt, setTipAmt] = useState("100");
  const [tipBusy, setTipBusy] = useState(false);
  const equipped = useEquippedStyles(p.id);
  const prog = rankProgress(p.total_wagered);
  const profit = Number(p.total_payout) - Number(p.total_wagered);
  const banned = p.banned_until && new Date(p.banned_until) > new Date();
  const isMe = p.id === userId;
  const tone = prog.cur.tone;

  async function handleSendTip() {
    const a = Number(tipAmt);
    if (!Number.isFinite(a) || a < 10) return toast.error("Minimum tip is 10 coins");
    setTipBusy(true);
    const { error } = await supabase.rpc("send_tip", {
      p_username: p.username,
      p_amount: a,
    });
    setTipBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(`Sent ${fmt(a)} coins tip to @${p.username}! 🪙`);
    setTipOpen(false);
    void refresh();
  }

  return (
    <div className="animate-pop-in text-white">
      {/* Banner with Rank Ambient Glow & Big Rank Badge */}
      <div
        className="relative h-28 overflow-hidden"
        style={{
          background: `radial-gradient(120% 140% at 30% 0%, ${tone}55, transparent 75%)`,
        }}
      >
        <img
          src={prog.cur.icon}
          alt=""
          className="absolute -right-4 -top-4 size-36 opacity-30 blur-[1px] object-contain transition-transform hover:scale-110"
        />
      </div>

      <div className="-mt-12 px-6 pb-6">
        <div className="flex items-end gap-4">
          <div
            className="relative rounded-full p-1"
            style={{
              boxShadow: `0 0 20px ${tone}60`,
              background: `linear-gradient(135deg, ${tone}, transparent)`,
            }}
          >
            <UserAvatar
              name={p.username}
              url={p.avatar_url}
              size={76}
              className="rounded-full ring-4 ring-[#141822]"
            />
          </div>
          <div className="pb-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <UserName userId={p.id} name={p.username} font={equipped.fontFamily} glow={equipped.glowClass} className="text-xl font-black truncate" />
              {p.is_vip && <VipTag />}
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
              <Calendar className="size-3" /> Joined {new Date(p.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {banned && (
          <p className="mt-3 rounded-xl border border-destructive/40 bg-destructive/15 px-3 py-1.5 text-xs font-bold text-destructive">
            This player is currently banned
          </p>
        )}

        {/* Rank Tier Card (derived from player rank tone) */}
        <div
          className="mt-4 flex items-center gap-4 rounded-2xl p-4 shadow-lg backdrop-blur-md"
          style={{
            border: `1px solid ${tone}35`,
            background: `linear-gradient(135deg, ${tone}20 0%, rgba(20,24,33,0.85) 100%)`,
          }}
        >
          <img src={prog.cur.icon} alt={prog.cur.name} className="size-14 shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="font-black text-sm tracking-wide" style={{ color: tone }}>
                {prog.cur.name} Tier
              </p>
              <span className="text-xs font-mono font-bold text-muted-foreground">
                {prog.pct.toFixed(0)}%
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground mt-0.5">
              {prog.next ? `${fmt(prog.remaining)} to ${prog.next.name}` : "Max rank unlocked"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/60 border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-500 shadow-sm"
                style={{
                  width: `${prog.pct}%`,
                  backgroundColor: tone,
                  boxShadow: `0 0 10px ${tone}`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: "Wagered", v: <Amount value={p.total_wagered} compact /> },
            { l: "Profit", v: <Amount value={profit} compact className={profit >= 0 ? "text-emerald-400" : "text-rose-400"} /> },
            { l: "Bets", v: fmtInt(p.bets_count) },
            { l: "Wins", v: fmtInt(p.wins_count) },
            { l: "Biggest win", v: <Amount value={p.biggest_win} compact /> },
            { l: "Best multi", v: `${Number(p.biggest_multiplier).toFixed(2)}×` },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 shadow-inner">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">{s.l}</p>
              <div className="mt-0.5 text-xs font-bold text-white">{s.v}</div>
            </div>
          ))}
        </div>

        {/* Recent Bets */}
        {bets.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</p>
            <div className="space-y-1">
              {bets.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl bg-black/30 border border-white/5 px-3 py-1.5 text-xs">
                  <span className="font-semibold text-white/90">{gameName(b.game)}</span>
                  <span className={cn("font-bold tabular font-mono", Number(b.payout) > Number(b.wager) ? "text-emerald-400" : "text-muted-foreground")}>
                    {Number(b.multiplier).toFixed(2)}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isMe && (
          <Button
            variant="outline"
            className="mt-4 w-full border-[#00d293]/50 text-[#00d293] hover:bg-[#00d293]/15 gap-2 font-bold rounded-full"
            onClick={() => {
              onClose();
              setCosmeticsOpen(true);
            }}
          >
            <Sparkles className="size-4" /> Cosmetics (Fonts & Glows)
          </Button>
        )}

        {!isMe && userId && (
          <div className="mt-4">
            {!tipOpen ? (
              <Button
                variant="outline"
                className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/15 gap-2 font-bold rounded-full"
                onClick={() => setTipOpen(true)}
              >
                <Coins className="size-4" /> Tip Player
              </Button>
            ) : (
              <div className="rounded-2xl border border-amber-500/40 bg-black/50 p-3 animate-fade-up">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                  <Coins className="size-3.5" /> Tip Coins to @{p.username}
                </p>
                <div className="flex gap-1.5 mb-2">
                  {[50, 100, 500, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setTipAmt(String(v))}
                      className={cn(
                        "flex-1 rounded-lg border py-1 text-xs font-bold transition",
                        Number(tipAmt) === v
                          ? "border-amber-400 bg-amber-400 text-black"
                          : "border-white/10 bg-black/40 text-foreground hover:bg-white/10"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={10}
                    value={tipAmt}
                    onChange={(e) => setTipAmt(e.target.value)}
                    placeholder="Amount (min 10)"
                    className="h-9 bg-black/50 text-sm font-bold border-white/10 text-white rounded-lg"
                  />
                  <Button
                    size="sm"
                    className="bg-amber-400 text-black hover:bg-amber-300 font-bold px-3 shrink-0 rounded-lg"
                    disabled={tipBusy || !(Number(tipAmt) >= 10)}
                    onClick={handleSendTip}
                  >
                    {tipBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground px-2 shrink-0 rounded-lg"
                    onClick={() => setTipOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {canAdmin && (
          <Button asChild variant="surface" className="mt-4 w-full rounded-full" onClick={onClose}>
            <Link to="/admin" search={{ user: p.id }}><ShieldCheck /> Manage in admin panel</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
