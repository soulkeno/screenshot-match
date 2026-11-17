import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Star, History, Trophy, BarChart3, Gift, Percent, Crown, ShieldCheck, ChevronsLeft, ChevronsRight, Vault, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { Logo, RankIcon } from "@/components/common/bits";
import { rankProgress } from "@/lib/ranks";
import { fmtCompact } from "@/lib/format";

const HOME = [
  { to: "/", label: "Home", icon: Home },
  { to: "/favourites", label: "Favourites", icon: Star },
  { to: "/recent", label: "Recently Played", icon: History },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
] as const;
const LIBRARY = [
  { to: "/shop", label: "Shop", icon: ShoppingBag },
  { to: "/stats", label: "Profile Stats", icon: BarChart3 },
  { to: "/rewards", label: "Daily Rewards", icon: Gift },
  { to: "/rakeback", label: "Rakeback", icon: Percent },
  { to: "/vip", label: "VIP", icon: Crown },
] as const;

export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle?: () => void; onNavigate?: () => void }) {
  const { profile, isAdmin } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const prog = rankProgress(profile?.total_wagered);

  const Item = ({ to, label, icon: Icon }: { to: string; label: string; icon: React.ComponentType<{ className?: string }> }) => {
    const active = to === "/" ? path === "/" : path.startsWith(to);
    return (
      <Link to={to} onClick={onNavigate} title={collapsed ? label : undefined}
        className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
          active ? "bg-gradient-primary text-primary-foreground shadow-press" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-foreground",
          collapsed && "justify-center px-0")}>
        <Icon className={cn("size-[18px] shrink-0", !active && "text-muted-foreground group-hover:text-primary")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-1">
      {!collapsed ? <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">{title}</p> : <div className="mx-auto my-3 h-px w-8 bg-border" />}
      {children}
    </div>
  );

  return (
    <aside className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200", collapsed ? "w-[76px]" : "w-[248px]")}>
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        {collapsed && onToggle ? (
          <button onClick={onToggle} className="rounded-lg p-1 hover:bg-sidebar-accent" aria-label="Expand sidebar" title="Expand sidebar"><Logo compact /></button>
        ) : <Link to="/" onClick={onNavigate}><Logo compact={collapsed} /></Link>}
        {onToggle && !collapsed && (
          <button onClick={onToggle} className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" aria-label="Collapse sidebar"><ChevronsLeft className="size-4" /></button>
        )}
      </div>

      {profile && !collapsed && (
        <Link to="/stats" onClick={onNavigate} className="mx-3 mb-2 block rounded-xl border border-border bg-surface-2/60 p-3 transition-colors hover:border-primary/40">
          <div className="flex items-center gap-3">
            <RankIcon wagered={profile.total_wagered} size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold" style={{ color: prog.cur.tone }}>{prog.cur.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{prog.next ? `${fmtCompact(prog.remaining)} to ${prog.next.name}` : "Max rank reached"}</p>
            </div>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-gradient-primary transition-all" style={{ width: `${prog.pct}%` }} />
          </div>
        </Link>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 no-scrollbar">
        <Group title="Home">{HOME.map((i) => <Item key={i.to} {...i} />)}</Group>
        <Group title="Library">{LIBRARY.map((i) => <Item key={i.to} {...i} />)}</Group>
        <Group title="Wallet"><Item to="/vault" label="Vault" icon={Vault} /></Group>
        {isAdmin && <Group title="Staff"><Item to="/admin" label="Admin Panel" icon={ShieldCheck} /></Group>}
      </nav>
      {onToggle && collapsed && (
        <button onClick={onToggle} className="mx-auto mb-4 rounded-md p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" aria-label="Expand sidebar"><ChevronsRight className="size-4" /></button>
      )}
    </aside>
  );
}
