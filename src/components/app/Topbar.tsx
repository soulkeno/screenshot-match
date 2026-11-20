import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, MessageSquare, Loader2, Star, History, Trophy, Sparkles, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { GAMES } from "@/lib/games/registry";
import { Amount, RankIcon, UserAvatar, UserName, Logo } from "@/components/common/bits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useEquippedStyles } from "@/lib/cosmetics";

type P = { id: string; username: string; avatar_url: string | null; total_wagered: number };

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, chatOpen, setChatOpen, setSettingsOpen, openProfile, setCosmeticsOpen } = useApp();
  const equipped = useEquippedStyles();
  const balance = profile?.balance ?? 0;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [players, setPlayers] = useState<P[]>([]);
  const [loadingP, setLoadingP] = useState(false);
  const [bump, setBump] = useState<"up" | "down" | null>(null);
  const lastBal = useRef(balance);
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (balance > lastBal.current) setBump("up");
    else if (balance < lastBal.current) setBump("down");
    lastBal.current = balance;
    const t = setTimeout(() => setBump(null), 800);
    return () => clearTimeout(t);
  }, [balance]);

  useEffect(() => {
    if (!q.trim()) { setPlayers([]); return; }
    const t = setTimeout(async () => {
      setLoadingP(true);
      const { data } = await supabase.from("profiles").select("id, username, avatar_url, total_wagered").ilike("username", `%${q}%`).limit(5);
      setPlayers(data ?? []);
      setLoadingP(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", fn);
    return () => window.removeEventListener("mousedown", fn);
  }, []);

  const games = q.trim() ? GAMES.filter((g) => g.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-[#121318]/95 px-4 backdrop-blur-xl md:px-6">
      {/* Left: Clean hamburger menu icon + bold italicized brand logo "KENO" */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-[#1a1d24] hover:text-foreground transition shadow-sm"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <Link to="/" className="flex items-center gap-2 select-none group">
          <Logo />
        </Link>
      </div>

      {/* Center-Left: Pill-shaped search bar with deep tactile styling */}
      <div ref={box} className="relative hidden w-full max-w-xs md:block lg:max-w-sm">
        <div className="relative overflow-hidden rounded-full border border-white/10 bg-gradient-to-b from-[#181c25] to-[#12141c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.06)]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search games..."
            className="h-10 w-full rounded-full bg-transparent pl-10 pr-4 text-xs font-medium text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:bg-[#1a1e28]"
          />
        </div>

        {open && q.trim() && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#181c25] shadow-2xl animate-fade-up">
            <p className="px-3 pt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Games</p>
            {games.length === 0 ? <p className="px-3 py-2 text-xs text-muted-foreground">No games found</p> : games.map((g) => (
              <button key={g.slug} onClick={() => { setOpen(false); navigate({ to: "/play/$slug", params: { slug: g.slug } }); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-[#222630] transition">
                <span className={cn("grid size-6 place-items-center rounded-md text-foreground", g.tone)}><g.icon className="size-3" /></span>
                <span className="font-semibold">{g.name}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">{g.category}</span>
              </button>
            ))}
            <p className="border-t border-white/5 px-3 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Players</p>
            {loadingP && <div className="p-3"><Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" /></div>}
            {!loadingP && players.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No players found</p>}
            {!loadingP && players.map((p) => (
              <button key={p.id} onClick={() => { setOpen(false); openProfile(p.id); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs hover:bg-[#222630] transition">
                <UserAvatar name={p.username} url={p.avatar_url} size={24} />
                <UserName userId={p.id} name={p.username} className="flex-1 font-medium truncate" />
                <RankIcon wagered={p.total_wagered} size={18} />
              </button>
            ))}
            <div className="h-1.5" />
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Currency selector pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-b from-[#1c202a] to-[#141720] px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-white/20 transition cursor-pointer select-none shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <span className="text-sm leading-none">🇬🇧</span>
          <span className="font-bold text-foreground text-[11px]">USD</span>
        </div>

        {/* Balance pill (single coin icon inside Amount, with compact format e.g. 1M / 25k) */}
        <div className="flex items-center rounded-full border border-white/10 bg-gradient-to-b from-[#1c202a] to-[#141720] px-3.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
          <Amount
            value={balance}
            compact={true}
            className={cn("text-xs font-mono font-bold transition-colors", bump === "up" && "text-[#00d293]", bump === "down" && "text-destructive")}
          />
        </div>

        {/* Bright emerald-teal pill button "● Deposit" */}
        <Link
          to="/vault"
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#00d293] to-emerald-400 hover:from-[#00d293]/95 hover:to-emerald-300 text-[#05261b] px-4 py-1.5 text-xs font-black shadow-[0_4px_16px_rgba(0,210,147,0.35),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all hover:scale-105 shrink-0"
        >
          <span className="size-2 rounded-full bg-[#05261b] animate-pulse" />
          <span>Deposit</span>
        </Link>

        {/* Player avatar with status ring + username */}
        {profile && (
          <Popover open={avatarOpen} onOpenChange={setAvatarOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#1c202a] to-[#141720] pl-1 pr-3 py-1 text-xs font-bold text-foreground hover:border-white/20 transition shrink-0 group focus:outline-none shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]"
                aria-label="Account & Cosmetics menu"
              >
                <div className="relative rounded-full ring-2 ring-[#00d293] p-0.5 transition-transform group-hover:scale-105">
                  <UserAvatar name={profile.username} url={profile.avatar_url} size={26} />
                </div>
                <span className="hidden md:inline font-bold text-foreground truncate max-w-[100px]">
                  {profile.username}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-64 p-2 border border-white/10 bg-[#181c25]/95 backdrop-blur-xl rounded-2xl shadow-2xl animate-fade-up z-50 text-foreground"
            >
              <div className="flex items-center gap-3 p-2.5 border-b border-white/5 pb-3 mb-1">
                <div className="relative rounded-full ring-2 ring-[#00d293] p-0.5">
                  <UserAvatar name={profile.username} url={profile.avatar_url} size={36} />
                </div>
                <div className="min-w-0 flex-1">
                  <UserName userId={profile.id} name={profile.username} font={equipped.fontFamily} glow={equipped.glowClass} className="text-sm font-bold truncate block" />
                  <p className="text-[11px] text-muted-foreground truncate">Player Profile</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setAvatarOpen(false);
                  setCosmeticsOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition bg-[#00d293]/15 text-[#00d293] hover:bg-[#00d293]/25 group my-1 border border-[#00d293]/30"
              >
                <Sparkles className="size-4 text-[#00d293] group-hover:rotate-12 transition-transform" />
                <span>Cosmetics</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-[#00d293] text-[#05261b] px-2 py-0.5 rounded-full shadow-sm">
                  Equip
                </span>
              </button>

              <Link
                to="/rank-progression"
                onClick={() => setAvatarOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-[#222630] text-foreground"
              >
                <Trophy className="size-4 text-amber-400" />
                <span>Rank Progression</span>
              </Link>

              <Link
                to="/shop"
                onClick={() => setAvatarOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-[#222630] text-foreground"
              >
                <ShoppingBag className="size-4 text-accent" />
                <span>Shop</span>
              </Link>

              <button
                onClick={() => {
                  setAvatarOpen(false);
                  openProfile(profile.id);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-[#222630] text-foreground"
              >
                <User className="size-4 text-muted-foreground" />
                <span>My Profile</span>
              </button>
            </PopoverContent>
          </Popover>
        )}

        {/* Chat toggle button icon with depth */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "grid size-10 place-items-center rounded-full border border-white/10 bg-gradient-to-b from-[#1c202a] to-[#141720] text-muted-foreground transition hover:text-foreground shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]",
            chatOpen && "text-[#00d293] border-[#00d293]/50 shadow-[0_0_15px_rgba(0,210,147,0.25)]"
          )}
          aria-label="Toggle chat"
        >
          <MessageSquare className="size-4" />
        </button>
      </div>
    </header>
  );
}
