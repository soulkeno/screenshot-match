import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, Settings, MessageSquare, Vault, Loader2, Star, History, Trophy, Sparkles, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { GAMES } from "@/lib/games/registry";
import { Amount, RankIcon, UserAvatar, UserName, Coin } from "@/components/common/bits";
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
      {/* Left: Clean hamburger menu icon + bold italicized brand logo "EMBER" */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenu}
          className="grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-[#1a1d24] hover:text-foreground transition"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <Link to="/" className="flex items-center gap-2 select-none group">
          <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#00d293] to-emerald-400 text-[#05261b] font-black text-xs shadow-md transition-transform group-hover:scale-105">
            ⚡
          </span>
          <span className="font-black italic text-xl md:text-2xl tracking-wider text-foreground">
            EMBER
          </span>
        </Link>
      </div>

      {/* Center-Left: Pill-shaped search bar ("🔍 Search games...") with dark slate background */}
      <div ref={box} className="relative hidden w-full max-w-xs md:block lg:max-w-sm">
        <div className="relative overflow-hidden rounded-full">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search games..."
            className="h-10 w-full rounded-full border border-white/5 bg-[#1a1d24] pl-10 pr-4 text-xs font-medium text-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-[#00d293]/60 focus:bg-[#222630]"
          />
        </div>

        {open && q.trim() && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#1a1d24] shadow-2xl animate-fade-up">
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
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-white/5 bg-[#1a1d24] px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-[#222630] transition cursor-pointer select-none">
          <span className="text-sm leading-none">🇬🇧</span>
          <span className="font-bold text-foreground text-[11px]">USD</span>
        </div>

        {/* Balance pill with gold coin icon + balance amount */}
        <div className="flex items-center gap-2 rounded-full border border-white/5 bg-[#1a1d24] px-3.5 py-1.5 shadow-sm">
          <Coin className="size-4" />
          <Amount
            value={balance}
            className={cn("text-xs font-mono font-bold transition-colors", bump === "up" && "text-[#00d293]", bump === "down" && "text-destructive")}
          />
        </div>

        {/* Bright emerald-teal pill button "● Deposit" / "Wallet" */}
        <Link
          to="/vault"
          className="flex items-center gap-1.5 rounded-full bg-[#00d293] hover:bg-[#00d293]/90 text-[#05261b] px-4 py-1.5 text-xs font-black shadow-md transition-all hover:scale-105 shrink-0"
        >
          <span className="size-2 rounded-full bg-[#05261b] animate-pulse" />
          <span>Deposit</span>
        </Link>

        {/* Player avatar with status ring + username */}
        {profile && (
          <Popover open={avatarOpen} onOpenChange={setAvatarOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 rounded-full border border-white/5 bg-[#1a1d24] pl-1 pr-3 py-1 text-xs font-bold text-foreground hover:bg-[#222630] transition shrink-0 group focus:outline-none"
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
              className="w-64 p-2 border border-white/10 bg-[#1a1d24]/95 backdrop-blur-xl rounded-2xl shadow-2xl animate-fade-up z-50 text-foreground"
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

              <button
                onClick={() => {
                  setAvatarOpen(false);
                  setSettingsOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition hover:bg-[#222630] text-foreground"
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Settings</span>
              </button>
            </PopoverContent>
          </Popover>
        )}

        {/* Chat toggle button icon */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={cn(
            "grid size-10 place-items-center rounded-full border border-white/5 bg-[#1a1d24] text-muted-foreground transition hover:bg-[#222630] hover:text-foreground shrink-0",
            chatOpen && "text-[#00d293] border-[#00d293]/40 bg-[#00d293]/10"
          )}
          aria-label="Toggle chat"
        >
          <MessageSquare className="size-4" />
        </button>
      </div>
    </header>
  );
}
