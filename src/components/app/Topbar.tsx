import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, Search, Settings, MessageSquare, Vault, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/lib/app-context";
import { GAMES } from "@/lib/games/registry";
import { Amount, RankIcon, UserAvatar } from "@/components/common/bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type P = { id: string; username: string; avatar_url: string | null; total_wagered: number };

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { profile, balance, chatOpen, setChatOpen, setSettingsOpen, openProfile } = useApp();
  const [q, setQ] = useState("");
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
        <button onClick={() => setChatOpen(!chatOpen)} className={cn("rounded-lg border border-border p-2.5 transition-colors hover:bg-surface-2", chatOpen ? "text-primary" : "text-muted-foreground")} aria-label="Toggle chat">
          <MessageSquare className="size-4" />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="rounded-lg border border-border p-2.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Settings">
          <Settings className="size-4" />
        </button>
        {profile && (
          <button onClick={() => openProfile(profile.id)} className="ml-1 rounded-lg ring-2 ring-transparent transition hover:ring-primary/60" aria-label="Your profile">
            <UserAvatar name={profile.username} url={profile.avatar_url} size={38} />
          </button>
        )}
      </div>
    </header>
  );
}
