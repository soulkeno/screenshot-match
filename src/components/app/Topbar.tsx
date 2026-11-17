import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, Settings, MessageSquare, Vault, Loader2, Gamepad2, ChevronDown, ChevronRight, Star, History, Trophy, Sparkles, User, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { GAMES } from "@/lib/games/registry";
import { Amount, RankIcon, UserAvatar, UserName } from "@/components/common/bits";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEquippedStyles } from "@/lib/cosmetics";

type P = { id: string; username: string; avatar_url: string | null; total_wagered: number };

function GamesMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const originals = GAMES.filter((g) => g.category === "originals" && g.slug !== "baccarat");
  const cases = GAMES.filter((g) => g.slug === "cases" || g.slug === "case-battles");
  const pvpAndMore = GAMES.filter((g) => g.slug === "pvp-coinflip" || g.slug === "mines-duel" || g.slug === "slots");

  const selectGame = (slug: string) => {
    setOpen(false);
    navigate({ to: "/play/$slug", params: { slug } });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-bold transition-all hover:bg-surface-2 hover:border-primary/50 shrink-0",
            open ? "border-primary/60 bg-surface-2 text-primary shadow-sm" : "text-foreground"
          )}
        >
          <Gamepad2 className="size-4 text-primary" />
          <span>Games</span>
          <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[360px] sm:w-[420px] max-h-[82vh] overflow-y-auto p-4 border-border bg-popover/95 backdrop-blur-xl shadow-2xl rounded-2xl animate-fade-up no-scrollbar z-50"
      >
        {/* Quick Nav Bar */}
        <div className="grid grid-cols-3 gap-1.5 pb-3 border-b border-border/60">
          <Link
            to="/favourites"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2 py-2 text-xs font-semibold text-foreground/90 transition hover:bg-surface-2 hover:text-gold"
          >
            <Star className="size-3.5 text-gold fill-current" /> Favorites
          </Link>
          <Link
            to="/recent"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2 py-2 text-xs font-semibold text-foreground/90 transition hover:bg-surface-2 hover:text-accent"
          >
            <History className="size-3.5 text-accent" /> Recent
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2 py-2 text-xs font-semibold text-foreground/90 transition hover:bg-surface-2 hover:text-primary"
          >
            <Trophy className="size-3.5 text-primary" /> Leaderboard
          </Link>
        </div>

        {/* ORIGINALS */}
        <div className="pt-3">
          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Originals</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {originals.map((g) => (
              <button
                key={g.slug}
                onClick={() => selectGame(g.slug)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition hover:bg-surface-2 group"
              >
                <span className={cn("grid size-6 place-items-center rounded-md shrink-0 transition-transform group-hover:scale-110", g.tone)}>
                  <g.icon className="size-3.5" />
                </span>
                <span className="truncate group-hover:text-primary transition-colors">{g.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CASES */}
        <div className="mt-4 pt-3 border-t border-border/60">
          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Cases</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {cases.map((g) => (
              <button
                key={g.slug}
                onClick={() => selectGame(g.slug)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition hover:bg-surface-2 group"
              >
                <span className={cn("grid size-6 place-items-center rounded-md shrink-0 transition-transform group-hover:scale-110", g.tone)}>
                  <g.icon className="size-3.5" />
                </span>
                <span className="truncate group-hover:text-primary transition-colors">{g.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* PVP & MORE */}
        <div className="mt-4 pt-3 border-t border-border/60">
          <p className="px-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">PvP & More</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {pvpAndMore.map((g) => (
              <button
                key={g.slug}
                onClick={() => selectGame(g.slug)}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition hover:bg-surface-2 group"
              >
                <span className={cn("grid size-6 place-items-center rounded-md shrink-0 transition-transform group-hover:scale-110", g.tone)}>
                  <g.icon className="size-3.5" />
                </span>
                <span className="truncate group-hover:text-primary transition-colors">{g.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-border/60">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10 transition"
          >
            <span>All games</span>
            <ChevronRight className="size-3.5" />
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, balance, chatOpen, setChatOpen, setSettingsOpen, openProfile, setCosmeticsOpen, setWheelOpen } = useApp();
  const equipped = useEquippedStyles(profile?.id ?? null);
  const [q, setQ] = useState("");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<P[]>([]);
  const [loading, setLoading] = useState(false);
  const [bump, setBump] = useState<"up" | "down" | null>(null);
  const prev = useRef(balance);
  const navigate = useNavigate();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (balance !== prev.current) {
      setBump(balance > prev.current ? "up" : "down");
      prev.current = balance;
      const t = setTimeout(() => setBump(null), 500);
      return () => clearTimeout(t);
    }
  }, [balance]);

  useEffect(() => {
    if (q.trim().length < 2) { setPlayers([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, username, avatar_url, total_wagered").ilike("username", `%${q.trim()}%`).limit(6);
      setPlayers((data as P[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const games = q.trim() ? GAMES.filter((g) => g.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl">
      <button onClick={onMenu} className="rounded-lg p-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
      <GamesMenu />

      <div ref={box} className="relative hidden w-full max-w-xs md:block">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Search games & players"
          className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/60" />
        {open && q.trim() && (
          <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-card animate-fade-up">
            {games.length > 0 && <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Games</p>}
            {games.map((g) => (
              <button key={g.slug} onClick={() => { setOpen(false); setQ(""); navigate({ to: "/play/$slug", params: { slug: g.slug } }); }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                <span className={cn("grid size-7 place-items-center rounded-md", g.tone)}><g.icon className="size-4" /></span>{g.name}
              </button>
            ))}
            <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Players</p>
            {loading && <div className="px-3 py-2 text-sm text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /></div>}
            {!loading && players.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">{q.trim().length < 2 ? "Type 2+ letters" : "No players found"}</p>}
            {players.map((p) => (
              <button key={p.id} onClick={() => { setOpen(false); setQ(""); openProfile(p.id); }} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-2">
                <UserAvatar name={p.username} url={p.avatar_url} size={28} />
                <span className="flex-1 font-medium">{p.username}</span>
                <RankIcon wagered={p.total_wagered} size={20} />
              </button>
            ))}
            <div className="h-2" />
          </div>
        )}
      </div>

      <div className="mx-auto flex items-center rounded-xl border border-border bg-surface p-1 pl-3 md:mx-0 md:ml-auto md:mr-auto">
        <Amount value={balance} className={cn("min-w-[110px] text-sm transition-colors", bump === "up" && "text-success", bump === "down" && "text-destructive")} />
        <Button asChild size="sm" className="ml-2">
          <Link to="/vault"><Vault /> Vault</Link>
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setWheelOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-bold text-accent transition hover:bg-accent/20 hover:scale-105 active:scale-95"
          title="Daily Lucky Wheel"
        >
          <Sparkles className="size-3.5 animate-spin" style={{ animationDuration: "4s" }} />
          <span className="hidden sm:inline">Lucky Wheel</span>
        </button>
        <button onClick={() => setChatOpen(!chatOpen)} className={cn("rounded-lg border border-border p-2.5 transition-colors hover:bg-surface-2", chatOpen ? "text-primary" : "text-muted-foreground")} aria-label="Toggle chat">
          <MessageSquare className="size-4" />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Settings">
          <Settings className="size-4" />
        </button>
        {profile && (
          <Popover open={avatarOpen} onOpenChange={setAvatarOpen}>
            <PopoverTrigger asChild>
              <button
                className="relative ml-1 rounded-full p-0.5 ring-2 ring-transparent transition hover:ring-primary/60 focus:outline-none"
                aria-label="Account & Cosmetics menu"
              >
                <UserAvatar name={profile.username} url={profile.avatar_url} size={38} />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={8}
              className="w-60 p-2 border-border bg-popover/95 backdrop-blur-xl rounded-2xl shadow-2xl animate-fade-up z-50"
            >
              <div className="flex items-center gap-3 p-2.5 border-b border-border/60 pb-3 mb-1">
                <UserAvatar name={profile.username} url={profile.avatar_url} size={40} />
                <div className="min-w-0 flex-1">
                  <UserName name={profile.username} font={equipped.fontFamily} glow={equipped.glowClass} className="text-sm font-bold truncate block" />
                  <p className="text-[11px] text-muted-foreground truncate">Player Profile</p>
                </div>
              </div>

              {/* User Avatar Click -> Cosmetics Button as requested */}
              <button
                onClick={() => {
                  setAvatarOpen(false);
                  setCosmeticsOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition bg-gradient-primary/10 text-primary hover:bg-gradient-primary/20 group my-1 border border-primary/20"
              >
                <Sparkles className="size-4 text-primary group-hover:rotate-12 transition-transform" />
                <span>Cosmetics</span>
                <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
                  Equip
                </span>
              </button>

              <Link
                to="/shop"
                onClick={() => setAvatarOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-surface-2 text-foreground"
              >
                <ShoppingBag className="size-4 text-accent" />
                <span>Shop</span>
              </Link>

              <button
                onClick={() => {
                  setAvatarOpen(false);
                  openProfile(profile.id);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-surface-2 text-foreground"
              >
                <User className="size-4 text-muted-foreground" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setAvatarOpen(false);
                  setSettingsOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition hover:bg-surface-2 text-foreground"
              >
                <Settings className="size-4 text-muted-foreground" />
                <span>Settings</span>
              </button>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </header>
  );
}
