import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Star, History, Trophy, Gift, Percent, Crown, ShieldCheck, ChevronsLeft, ChevronsRight,
  Vault, ShoppingBag, Flame, Sparkles, Rocket, Disc3, Zap, Globe, Ticket, Coins, Swords, Plane, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";
import { Logo, RankIcon, SnowCap } from "@/components/common/bits";
import { rankProgress } from "@/lib/ranks";
import { fmtCompact } from "@/lib/format";
import { CLUBS, getClubTier } from "@/lib/clubs";

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { profile, isAdmin, setSettingsOpen } = useApp();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const prog = rankProgress(profile?.total_wagered);
  const clubTier = getClubTier(profile);
  const clubMeta = CLUBS[clubTier];

  const MENU_CATEGORIES = [
    { to: "/play/blackjack", label: "Live Casino", icon: Disc3, tone: "text-emerald-400 group-hover:text-emerald-300" },
    { to: "/play/slots", label: "Slots", icon: Plane, tone: "text-cyan-400 group-hover:text-cyan-300" },
    { to: "/play/crash", label: "Hot Games", icon: Flame, tone: "text-amber-400 group-hover:text-amber-300" },
    { to: "/play/crash", label: "Crash", icon: Rocket, tone: "text-rose-400 group-hover:text-rose-300" },
    { to: "/play/roulette", label: "Roulette", icon: Disc3, tone: "text-purple-400 group-hover:text-purple-300" },
    { to: "/play/limbo", label: "High Volatility", icon: Zap, tone: "text-yellow-400 group-hover:text-yellow-300" },
    { to: "/play/chess", label: "PVP Duels", icon: Swords, tone: "text-indigo-400 group-hover:text-indigo-300" },
  ];

  const SECONDARY_LINKS = [
    { to: "/recent", label: "Picks For You", icon: History },
    { to: "/favourites", label: "Favourites", icon: Star },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/rewards", label: "Rewards & Quests", icon: Gift },
    { to: "/vault", label: "Vault", icon: Vault },
  ];

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-[#1e1735]/80 bg-[#0d091a]/95 backdrop-blur-xl transition-[width] duration-300 z-30",
        collapsed ? "w-[76px]" : "w-[260px]"
      )}
    >
      {/* Brand Header */}
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        {collapsed && onToggle ? (
          <button onClick={onToggle} className="rounded-lg p-1 hover:bg-white/5" aria-label="Expand sidebar">
            <Logo compact />
          </button>
        ) : (
          <Link to="/" onClick={onNavigate}>
            <Logo compact={collapsed} />
          </Link>
        )}
        {onToggle && !collapsed && (
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Top Card: "MY VIP PERKS" / "CLUBS" (Matching Screenshot) */}
      {!collapsed && (
        <div className="mx-3 mb-3 rounded-2xl border border-primary/25 bg-gradient-to-b from-[#21183c] to-[#150f29] p-3.5 shadow-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground/90">
              MY VIP PERKS
            </span>
            <Link
              to="/clubs"
              onClick={onNavigate}
              className="text-[11px] font-bold text-primary hover:text-primary-foreground transition-colors"
            >
              View All
            </Link>
          </div>

          {/* Two Glowing Action Buttons: BONUSCODE & RAKEBACK */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              to="/rewards"
              onClick={onNavigate}
              className="flex flex-col items-center justify-center rounded-xl border border-purple-500/30 bg-gradient-to-b from-purple-600/20 to-purple-800/10 p-2.5 text-center transition-all hover:scale-[1.02] hover:border-purple-400/50 shadow-md group"
            >
              <Ticket className="size-4 text-purple-400 group-hover:rotate-12 transition-transform" />
              <span className="mt-1 text-[11px] font-black text-foreground uppercase tracking-tight">
                BONUSCODE
              </span>
              <span className="text-[9px] font-bold text-purple-300/80">Redeem</span>
            </Link>

            <Link
              to="/rakeback"
              onClick={onNavigate}
              className="flex flex-col items-center justify-center rounded-xl border border-indigo-500/30 bg-gradient-to-b from-indigo-600/20 to-indigo-800/10 p-2.5 text-center transition-all hover:scale-[1.02] hover:border-indigo-400/50 shadow-md group"
            >
              <Coins className="size-4 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="mt-1 text-[11px] font-black text-foreground uppercase tracking-tight">
                RAKEBACK
              </span>
              <span className="text-[9px] font-bold text-indigo-300/80">
                {clubMeta.name.replace(" Club", "")} · {clubMeta.multiplier}×
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* Nav Content */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4 no-scrollbar">
        {/* Menu Section (Matching Screenshot) */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/60">
              Menu
            </p>
          )}

          {MENU_CATEGORIES.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                  active
                    ? "bg-gradient-to-r from-primary/30 to-purple-600/20 border border-primary/40 text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                  collapsed && "justify-center px-0 py-2.5"
                )}
              >
                <item.icon className={cn("size-4 shrink-0 transition-transform group-hover:scale-110", item.tone)} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Library / Other Links */}
        <div className="space-y-1 pt-2 border-t border-white/5">
          {SECONDARY_LINKS.map((item) => {
            const active = path === item.to;
            return (
              <Link
                key={item.label}
                to={item.to}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition-all",
                  active
                    ? "bg-white/10 text-foreground font-bold"
                    : "text-muted-foreground/80 hover:bg-white/5 hover:text-foreground",
                  collapsed && "justify-center px-0 py-2.5"
                )}
              >
                <item.icon className="size-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          <Link
            to="/clubs"
            onClick={onNavigate}
            title={collapsed ? "Clubs" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all text-amber-400 hover:bg-amber-500/10",
              path === "/clubs" && "bg-amber-500/15 border border-amber-500/30",
              collapsed && "justify-center px-0 py-2.5"
            )}
          >
            <Crown className="size-4 shrink-0 text-gold" />
            {!collapsed && <span>Clubs</span>}
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              onClick={onNavigate}
              title={collapsed ? "Admin Panel" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-bold transition-all text-primary hover:bg-primary/10",
                path === "/admin" && "bg-primary/20 border border-primary/30",
                collapsed && "justify-center px-0 py-2.5"
              )}
            >
              <ShieldCheck className="size-4 shrink-0" />
              {!collapsed && <span>Admin Panel</span>}
            </Link>
          )}
        </div>
      </nav>

      {/* Footer Language Selector Pill (Matching Screenshot) */}
      {!collapsed && (
        <div className="p-3 border-t border-white/5">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-surface/50 px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-all"
          >
            <span className="flex items-center gap-2">
              <Globe className="size-3.5 text-primary" /> English
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {onToggle && collapsed && (
        <button
          onClick={onToggle}
          className="mx-auto mb-4 rounded-md p-2 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          aria-label="Expand sidebar"
        >
          <ChevronsRight className="size-4" />
        </button>
      )}
    </aside>
  );
}
